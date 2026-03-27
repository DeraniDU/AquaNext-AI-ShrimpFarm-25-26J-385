import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useTranslation } from "../hooks/useTranslation";

// Move InputField outside component to prevent recreation on every render
const InputField = ({ label, name, type = "text", placeholder, required = true, helpText, options, selectPlaceholder, value, onChange, onBlur, error }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {options ? (
      <select
        name={name}
        value={value || ""}
        onChange={onChange}
        onBlur={onBlur}
        className={`w-full border rounded-lg px-4 py-2.5 sm:py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[44px] touch-manipulation ${
          error ? "border-red-500 bg-red-50" : "border-gray-300"
        }`}
      >
        <option value="">{selectPlaceholder || `Select ${label}`}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    ) : (
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        step={type === "number" ? "any" : undefined}
        className={`w-full border rounded-lg px-4 py-2.5 sm:py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[44px] touch-manipulation ${
          error ? "border-red-500 bg-red-50" : "border-gray-300"
        }`}
      />
    )}
    {helpText && !error && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
    {error && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><span>⚠</span> {error}</p>}
  </div>
);

export default function FarmerSetup() {
  const { t } = useTranslation();
  const [batches, setBatches] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    batchName: "",
    shrimpAge: "",
    plStocked: "",
    pondSize: "",
    pondSizeUnit: "acre",
    cultivationType: "Biofloc Tank",
    species: "",
    survivalRate: "",
    feedBrand: ""
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await API.get("/batch");
      setBatches(res.data);
    } catch (error) {
      console.error("Error fetching batches:", error);
    }
  };

  const validateField = useCallback((name, value) => {
    let error = "";

    switch (name) {
      case "batchName":
        if (!value.trim()) error = "Batch name is required";
        else if (value.length < 3) error = "Batch name must be at least 3 characters";
        else if (value.length > 50) error = "Batch name must be less than 50 characters";
        break;

      case "species":
        if (!value.trim()) error = "Species is required";
        break;

      case "plStocked":
        if (!value) error = "PL stocked is required";
        else if (Number(value) <= 0) error = "PL stocked must be greater than 0";
        else if (Number(value) > 10000000) error = "PL stocked seems unrealistic";
        break;

      case "shrimpAge":
        if (value === "") error = "Initial shrimp age is required";
        else if (Number(value) < 0) error = "Age cannot be negative";
        else if (Number(value) > 200) error = "Age seems too high";
        break;

      case "pondSize":
        if (!value) error = "Pond size is required";
        else if (Number(value) <= 0) error = "Pond size must be greater than 0";
        else if (Number(value) > 1000) error = "Pond size seems unrealistic";
        break;

      case "survivalRate":
        if (!value) error = "Survival rate is required";
        else if (Number(value) < 0 || Number(value) > 1) error = "Survival rate must be between 0 and 1";
        break;

      case "feedBrand":
        if (!value) error = "Feed brand is required";
        break;

      default:
        break;
    }

    return error;
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const newForm = { ...prev, [name]: value };
      return newForm;
    });
    // Clear error for this field when user starts typing
    setErrors(prev => {
      if (prev[name]) {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      }
      return prev;
    });
  }, []);

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [validateField]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    Object.keys(form).forEach(key => {
      const error = validateField(key, form[key]);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form, validateField]);

  const handleCreateBatch = async () => {
    if (!validateForm()) {
      alert(t("farmerSetup.fixErrorsBeforeSubmit"));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        shrimpAge: Number(form.shrimpAge),
        plStocked: Number(form.plStocked),
        pondSize: Number(form.pondSize),
        survivalRate: Number(form.survivalRate)
      };

      await API.post("/batch", payload);

      setForm({
        batchName: "",
        shrimpAge: "",
        plStocked: "",
        pondSize: "",
        pondSizeUnit: "acre",
        cultivationType: "Biofloc Tank",
        species: "",
        survivalRate: "",
        feedBrand: ""
      });
      setErrors({});
      setShowCreateForm(false);
      fetchBatches();
      alert(t("farmerSetup.batchCreatedSuccess"));
    } catch (error) {
      console.error("Error creating batch:", error);
      alert(error.response?.data?.message || "Failed to create batch");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchClick = useCallback((batchId) => {
    navigate(`/batch/${batchId}`);
  }, [navigate]);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-700";
      case "active": return "bg-green-100 text-green-700";
      case "completed": return "bg-blue-100 text-blue-700";
      case "archived": return "bg-purple-100 text-purple-700";
      default: return "bg-gray-100 text-gray-700";
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - mobile: stack title and button */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-1 sm:mb-2">{t("farmerSetup.myShrimpBatches")}</h1>
            <p className="text-sm sm:text-base text-gray-600">{t("farmerSetup.subtitle")}</p>
          </div>
          <button
            onClick={() => { setShowCreateForm(!showCreateForm); if (showCreateForm) setErrors({}); }}
            className={`w-full sm:w-auto min-h-[44px] px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl touch-manipulation ${
              showCreateForm 
                ? "bg-gray-500 hover:bg-gray-600 text-white" 
                : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
            }`}
          >
            {showCreateForm ? `✕ ${t("farmerSetup.cancelButton")}` : `+ ${t("farmerSetup.newBatch")}`}
          </button>
        </div>

        {/* Create Batch Form - mobile: single column, touch-friendly */}
        {showCreateForm && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-8 border-2 border-blue-300 rounded-2xl bg-white shadow-xl">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">+</div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{t("farmerSetup.createNewBatch")}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <InputField 
                label={t("farmerSetup.batchName")}
                name="batchName"
                placeholder={t("farmerSetup.batchNamePlaceholder")}
                helpText={t("farmerSetup.batchNameHelp")}
                value={form.batchName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.batchName}
              />
              
              <InputField 
                label={t("farmerSetup.species")}
                name="species"
                selectPlaceholder={t("farmerSetup.selectSpecies")}
                options={[
                  { value: "Vannamei", label: t("farmerSetup.speciesVannamei") },
                  { value: "Monodon", label: t("farmerSetup.speciesMonodon") },
                  { value: "Indicus", label: t("farmerSetup.speciesIndicus") },
                  { value: "Other", label: t("farmerSetup.speciesOther") }
                ]}
                value={form.species}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.species}
              />

              <InputField 
                label={t("farmerSetup.plStocked")}
                name="plStocked"
                type="number"
                placeholder={t("farmerSetup.plStockedPlaceholder")}
                helpText={t("farmerSetup.plStockedHelp")}
                value={form.plStocked}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.plStocked}
              />

              <InputField 
                label={t("farmerSetup.shrimpAge")}
                name="shrimpAge"
                type="number"
                placeholder={t("farmerSetup.shrimpAgePlaceholder")}
                helpText={t("farmerSetup.shrimpAgeHelp")}
                value={form.shrimpAge}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.shrimpAge}
              />
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t("farmerSetup.pondSize")} <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="number" 
                    name="pondSize" 
                    value={form.pondSize} 
                    onChange={handleChange} 
                    onBlur={handleBlur} 
                    placeholder={t("farmerSetup.pondSizePlaceholder")}
                    className={`border rounded-lg px-4 py-2.5 sm:py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] touch-manipulation ${errors.pondSize ? "border-red-500 bg-red-50" : "border-gray-300"}`} 
                  />
                  <select 
                    name="pondSizeUnit" 
                    value={form.pondSizeUnit} 
                    onChange={handleChange} 
                    className="border border-gray-300 rounded-lg px-4 py-2.5 sm:py-3 focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
                  >
                    <option value="acre">{t("farmerSetup.pondSizeUnitAcre")}</option>
                    <option value="hectare">{t("farmerSetup.pondSizeUnitHectare")}</option>
                    <option value="sqm">{t("farmerSetup.pondSizeUnitSqm")}</option>
                  </select>
                </div>
                {errors.pondSize && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><span>⚠</span> {errors.pondSize}</p>}
              </div>

              <InputField 
                label={t("farmerSetup.cultivationType")}
                name="cultivationType"
                options={[{ value: "Biofloc Tank", label: t("farmerSetup.bioflocTank") }]}
                value={form.cultivationType}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.cultivationType}
              />

              <InputField 
                label={t("farmerSetup.survivalRate")}
                name="survivalRate"
                type="number"
                placeholder={t("farmerSetup.survivalRatePlaceholder")}
                helpText={t("farmerSetup.survivalRateHelp")}
                value={form.survivalRate}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.survivalRate}
              />

              <InputField 
                label={t("farmerSetup.feedBrand")}
                name="feedBrand"
                selectPlaceholder={t("farmerSetup.selectFeedBrand")}
                options={[
                  { value: "CP", label: "CP Feeds" },
                  { value: "Grobest", label: "Grobest Feeds" },
                  { value: "BioMar", label: "BioMar" },
                  { value: "Skretting/Cargill", label: "Skretting/Cargill" },
                  { value: "Taprobana", label: "Taprobana Seafood Group" },
                  { value: "Mahesh Aqua Holdings", label: "Mahesh Aqua Holdings" },
                  { value: "Naqda Initiative", label: "Naqda Initiative" }
                ]}
                value={form.feedBrand}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.feedBrand}
              />
            </div>

            <div className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
              <button onClick={handleCreateBatch} disabled={isSubmitting} className={`w-full sm:flex-1 min-h-[44px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation ${isSubmitting ? "cursor-wait" : ""}`}>
                {isSubmitting ? t("farmerSetup.creating") : `✓ ${t("farmerSetup.createBatchButton")}`}
              </button>
              <button onClick={() => { setShowCreateForm(false); setErrors({}); }} className="w-full sm:w-auto min-h-[44px] px-6 sm:px-8 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-semibold transition-all touch-manipulation">
                {t("farmerSetup.cancel")}
              </button>
            </div>
          </div>
        )}

        {/* Batch List - mobile: single column, touch-friendly cards */}
        <div className="space-y-4">
          {batches.length === 0 ? (
            <div className="text-center py-12 sm:py-20 bg-white rounded-2xl shadow-lg px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl sm:text-4xl">🦐</span>
              </div>
              <p className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">{t("farmerSetup.noBatchesYet")}</p>
              <p className="text-sm sm:text-base text-gray-500 mb-6">{t("farmerSetup.startByCreatingFirst")}</p>
              <button onClick={() => setShowCreateForm(true)} className="min-h-[44px] w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl touch-manipulation">
                + {t("farmerSetup.createFirstBatch")}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{t("farmerSetup.activeBatches")} ({batches.length})</h2>
              </div>
              {batches.map(batch => (
                <div key={batch.id} onClick={() => handleBatchClick(batch.id)} className="p-4 sm:p-6 border-2 border-gray-200 rounded-2xl hover:shadow-2xl hover:border-blue-300 transition-all cursor-pointer bg-white group active:bg-blue-50/30 touch-manipulation">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                        <h3 className="text-lg sm:text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors break-words">{batch.batchName}</h3>
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold uppercase flex-shrink-0 ${getStatusColor(batch.status)}`}>{batch.status}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 text-sm">
                        <div className="bg-blue-50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">{t("farmerSetup.species")}</p>
                          <p className="font-semibold text-gray-800 truncate">{batch.species || "N/A"}</p>
                        </div>
                        <div className="bg-green-50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">{t("farmerSetup.currentAge")}</p>
                          <p className="font-semibold text-gray-800">{batch.currentShrimpAge || batch.shrimpAge} days</p>
                        </div>
                        <div className="bg-purple-50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">{t("farmerSetup.plStocked")}</p>
                          <p className="font-semibold text-gray-800">{batch.plStocked?.toLocaleString()}</p>
                        </div>
                        <div className="bg-yellow-50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">{t("farmerSetup.pondSize")}</p>
                          <p className="font-semibold text-gray-800">{batch.pondSize} {batch.pondSizeUnit}</p>
                        </div>
                        <div className="bg-pink-50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">{t("farmerSetup.type")}</p>
                          <p className="font-semibold text-gray-800 truncate">{batch.cultivationType || "N/A"}</p>
                        </div>
                        <div className="bg-orange-50 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">{t("farmerSetup.feedBrand")}</p>
                          <p className="font-semibold text-gray-800 truncate">{batch.feedBrand || "N/A"}</p>
                        </div>
                        <div className="bg-teal-50 p-2 sm:p-3 rounded-lg col-span-2 sm:col-span-1">
                          <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">{t("farmerSetup.survivalRate")}</p>
                          <p className="font-semibold text-gray-800">{batch.survivalRate ? `${(batch.survivalRate * 100).toFixed(0)}%` : "N/A"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="sm:ml-6 sm:text-right flex-shrink-0">
                      <div className="min-h-[44px] flex items-center justify-center sm:justify-end bg-blue-600 group-hover:bg-blue-700 text-white px-4 py-3 sm:py-2 rounded-lg font-semibold transition-colors">
                        {t("farmerSetup.viewDetails")} →
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}