import sys

with open('frontend/web/src/components/OptimizationView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_str = "			{activeTab === 'labor' && ("
end_str = "			{activeTab === 'benchmarking' && ("

start_idx = content.find(start_str)
end_idx = content.find(end_str, start_idx)

if start_idx != -1 and end_idx != -1:
    new_labor_section = "			{activeTab === 'labor' && (\n\t\t\t\t<LaborOptimizationView data={data} history={history} pondFilter={pondFilter} ponds={ponds} embedded />\n\t\t\t)}\n\n"
    new_content = content[:start_idx] + new_labor_section + content[end_idx:]
    with open('frontend/web/src/components/OptimizationView.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Success")
else:
    print("Could not find start or end string")
