# app/routes/export.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, Response
from datetime import datetime
from bson import ObjectId
from io import BytesIO, StringIO
import csv
import re
import logging

from app.database.mongo import db

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/export", tags=["Export"])

# ==================== CSV EXPORT ====================
@router.get("/batch/{batch_id}/csv")
async def export_batch_csv(batch_id: str):
    """Export batch feeding history as CSV"""
    if not ObjectId.is_valid(batch_id):
        raise HTTPException(status_code=400, detail="Invalid batch ID")

    # Get batch info
    batch = await db.farmerinputs.find_one({"_id": ObjectId(batch_id)})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Get all feeding records for this batch
    feedings = []
    cursor = db.feedingresults.find({"batchId": batch_id}).sort("day", 1)  # Sort by day ascending
    async for feeding in cursor:
        feed_date = feeding.get("date")
        if isinstance(feed_date, datetime):
            feed_date = feed_date.strftime("%Y-%m-%d %H:%M:%S")
        elif isinstance(feed_date, str):
            pass  # Already a string
        else:
            feed_date = "N/A"
        
        feedings.append({
            "Day": feeding.get("day", ""),
            "Date": feed_date,
            "Biomass (kg)": round(feeding.get("biomass", 0), 2),
            "Feed Amount (kg)": round(feeding.get("feedAmountKg", 0), 2),
            "Feed Rate (%)": round(feeding.get("feedRate", 0) * 100, 2) if feeding.get("feedRate") else 0
        })

    # Create CSV in memory
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=["Day", "Date", "Biomass (kg)", "Feed Amount (kg)", "Feed Rate (%)"])
    writer.writeheader()
    writer.writerows(feedings)
    
    # Prepare response
    output.seek(0)
    csv_content = output.getvalue()
    output.close()
    
    # Generate filename
    batch_name = batch.get("batchName", "batch").replace(" ", "_")
    filename = f"{batch_name}_feeding_history_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

# ==================== PDF EXPORT ====================
@router.get("/batch/{batch_id}/pdf")
async def export_batch_pdf(batch_id: str):
    """Export batch feeding history as PDF"""
    logger.info(f"PDF export requested for batch: {batch_id}")
    
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        logger.info("ReportLab imports successful")
    except ImportError as e:
        error_msg = f"PDF generation requires 'reportlab' package. Install it with: pip install reportlab. Error: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

    if not ObjectId.is_valid(batch_id):
        raise HTTPException(status_code=400, detail="Invalid batch ID")

    try:
        logger.info(f"Fetching batch data for: {batch_id}")
        # Get batch info
        batch = await db.farmerinputs.find_one({"_id": ObjectId(batch_id)})
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")

        # Get all feeding records
        feedings = []
        cursor = db.feedingresults.find({"batchId": batch_id}).sort("day", 1)
        async for feeding in cursor:
            feed_date = feeding.get("date")
            if isinstance(feed_date, datetime):
                feed_date = feed_date.strftime("%Y-%m-%d")
            elif isinstance(feed_date, str):
                try:
                    # Try to parse ISO format
                    if 'T' in feed_date or '+' in feed_date or 'Z' in feed_date:
                        feed_date = datetime.fromisoformat(feed_date.replace('Z', '+00:00')).strftime("%Y-%m-%d")
                    else:
                        feed_date = feed_date[:10] if len(feed_date) >= 10 else feed_date
                except Exception:
                    feed_date = str(feed_date)[:10] if feed_date else "N/A"
            else:
                feed_date = "N/A"
            
            feedings.append({
                "day": str(feeding.get("day", "")),
                "date": str(feed_date),
                "biomass": round(float(feeding.get("biomass", 0) or 0), 2),
                "feed_amount": round(float(feeding.get("feedAmountKg", 0) or 0), 2),
                "feed_rate": round(float(feeding.get("feedRate", 0) or 0) * 100, 2)
            })

        # Create PDF in memory
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        # Container for PDF elements
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=12,
            alignment=1  # Center
        )
        elements.append(Paragraph("Feeding History Report", title_style))
        elements.append(Spacer(1, 0.2*inch))
        
        # Batch Information
        batch_info_style = ParagraphStyle(
            'BatchInfo',
            parent=styles['Normal'],
            fontSize=11,
            spaceAfter=6
        )
        
        # Helper function to escape HTML for safe PDF rendering
        def escape_html(text):
            """Escape HTML special characters"""
            if text is None:
                return "N/A"
            text = str(text)
            text = text.replace("&", "&amp;")
            text = text.replace("<", "&lt;")
            text = text.replace(">", "&gt;")
            return text
        
        # Sanitize batch data for PDF
        batch_name_raw = batch.get("batchName", "N/A") or "N/A"
        batch_name = escape_html(batch_name_raw)
        species = escape_html(batch.get("species", "N/A") or "N/A")
        try:
            pl_stocked = int(batch.get("plStocked", 0) or 0)
        except (ValueError, TypeError):
            pl_stocked = 0
        current_age = batch.get("currentShrimpAge") or batch.get("shrimpAge", "N/A")
        current_age = escape_html(str(current_age) if current_age != "N/A" else "N/A")
        status = escape_html(str(batch.get("status", "N/A") or "N/A").upper())
        
        elements.append(Paragraph(f"<b>Batch Name:</b> {batch_name}", batch_info_style))
        elements.append(Paragraph(f"<b>Species:</b> {species}", batch_info_style))
        elements.append(Paragraph(f"<b>PL Stocked:</b> {pl_stocked:,}", batch_info_style))
        elements.append(Paragraph(f"<b>Current Age:</b> {current_age} days", batch_info_style))
        elements.append(Paragraph(f"<b>Status:</b> {status}", batch_info_style))
        elements.append(Spacer(1, 0.3*inch))
        
        # Summary Statistics
        if feedings:
            total_feed = sum(f.get("feed_amount", 0) for f in feedings)
            avg_feed = total_feed / len(feedings) if len(feedings) > 0 else 0
            avg_rate = sum(f.get("feed_rate", 0) for f in feedings) / len(feedings) if len(feedings) > 0 else 0
            
            elements.append(Paragraph("<b>Summary Statistics</b>", batch_info_style))
            elements.append(Paragraph(f"Total Records: {len(feedings)}", batch_info_style))
            elements.append(Paragraph(f"Total Feed Given: {round(total_feed, 2)} kg", batch_info_style))
            elements.append(Paragraph(f"Average Daily Feed: {round(avg_feed, 2)} kg", batch_info_style))
            elements.append(Paragraph(f"Average Feed Rate: {round(avg_rate, 2)}%", batch_info_style))
            elements.append(Spacer(1, 0.3*inch))
        
        # Feeding History Table
        if feedings:
            # Table header
            table_data = [["Day", "Date", "Biomass (kg)", "Feed Amount (kg)", "Feed Rate (%)"]]
            
            # Table rows - limit to prevent huge PDFs
            max_rows = 100  # Limit to 100 rows per page
            for feeding in feedings[:max_rows]:
                table_data.append([
                    str(feeding["day"]),
                    str(feeding["date"]),
                    str(feeding["biomass"]),
                    str(feeding["feed_amount"]),
                    str(feeding["feed_rate"])
                ])
            
            # Create table - adjust column widths to fit A4 page (8.27 inches wide)
            # Total: 0.7 + 1.0 + 1.0 + 1.0 + 1.0 = 4.7 inches (with margins, fits well)
            table = Table(table_data, colWidths=[0.7*inch, 1.0*inch, 1.0*inch, 1.0*inch, 1.0*inch])
            try:
                table.setStyle(TableStyle([
                    # Header row
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    # Data rows
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 9),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                ]))
            except Exception as style_error:
                # Fallback to simpler style if there's an issue
                print(f"Table style error, using simple style: {style_error}")
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ]))
            
            elements.append(table)
            
            if len(feedings) > max_rows:
                elements.append(Spacer(1, 0.2*inch))
                elements.append(Paragraph(
                    f"<i>Note: Showing first {max_rows} records out of {len(feedings)} total records.</i>",
                    batch_info_style
                ))
        else:
            elements.append(Paragraph("<i>No feeding records found for this batch.</i>", batch_info_style))
        
        # Footer
        elements.append(Spacer(1, 0.3*inch))
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.grey,
            alignment=1  # Center
        )
        elements.append(Paragraph(
            f"Generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}",
            footer_style
        ))
        
        # Build PDF
        try:
            logger.info(f"Building PDF with {len(elements)} elements")
            doc.build(elements)
            logger.info("PDF built successfully")
        except Exception as build_error:
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"PDF Build Error: {error_details}")
            print(f"PDF Build Error: {error_details}", flush=True)  # Force flush
            raise HTTPException(
                status_code=500,
                detail=f"Error building PDF document: {str(build_error)}"
            )
        
        buffer.seek(0)
        pdf_content = buffer.getvalue()
        buffer.close()
        
        # Generate filename - sanitize for filesystem (use raw batch name, not escaped)
        safe_batch_name = re.sub(r'[^\w\s-]', '', str(batch_name_raw)).strip().replace(' ', '_')
        if not safe_batch_name or safe_batch_name == "N_A":
            safe_batch_name = "batch"
        filename = f"{safe_batch_name}_feeding_report_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
        
        if not pdf_content or len(pdf_content) < 100:
            raise HTTPException(
                status_code=500,
                detail="Generated PDF is empty or corrupted"
            )
        
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"PDF Export Error: {error_details}")
        # Print to both stdout and stderr to ensure visibility
        print(f"\n{'='*60}", flush=True)
        print(f"PDF Export Error: {error_details}", flush=True)
        print(f"Exception type: {type(e).__name__}", flush=True)
        print(f"Exception message: {str(e)}", flush=True)
        print(f"{'='*60}\n", flush=True)
        import sys
        sys.stderr.write(f"PDF Export Error: {error_details}\n")
        sys.stderr.flush()
        raise HTTPException(
            status_code=500,
            detail=f"Error generating PDF: {str(e)}. Check server logs for details."
        )

