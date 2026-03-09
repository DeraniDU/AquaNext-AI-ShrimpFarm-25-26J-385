import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

// Move InputField outside component to prevent recreation on every render
const InputField = ({ label, name, type = "text", placeholder, required = true, helpText, options, value, onChange, onBlur, error }) => (
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
        className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
          error ? "border-red-500 bg-red-50" : "border-gray-300"
        }`}
      >
        <option value="">Select {label}</option>
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
        className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
          error ? "border-red-500 bg-red-50" : "border-gray-300"
        }`}
      />
    )}
    {helpText && !error && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
    {error && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><span>⚠</span> {error}</p>}
  </div>
);

export default function FarmerSetup() {
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
      alert("Please fix all errors before submitting");
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
      alert("Batch created successfully!");
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">My Shrimp Batches</h1>
            <p className="text-gray-600">Manage and monitor your shrimp cultivation batches</p>
          </div>
          <button
            onClick={() => { setShowCreateForm(!showCreateForm); if (showCreateForm) setErrors({}); }}
            className={`px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl ${
              showCreateForm 
                ? "bg-gray-500 hover:bg-gray-600 text-white" 
                : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
            }`}
          >
            {showCreateForm ? "✕ Cancel" : "+ New Batch"}
          </button>
        </div>

        {/* Create Batch Form */}
        {showCreateForm && (
          <div className="mb-8 p-8 border-2 border-blue-300 rounded-2xl bg-white shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">+</div>
              <h2 className="text-2xl font-bold text-gray-800">Create New Batch</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField 
                label="Batch Name" 
                name="batchName" 
                placeholder="e.g., Pond A - Jan 2024" 
                helpText="Unique identifier for this batch"
                value={form.batchName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.batchName}
              />
              
              <InputField 
                label="Species" 
                name="species" 
                options={[
                  { value: "Vannamei", label: "Vannamei (White Shrimp)" },
                  { value: "Monodon", label: "Monodon (Black Tiger)" },
                  { value: "Indicus", label: "Indicus (Indian White)" },
                  { value: "Other", label: "Other" }
                ]}
                value={form.species}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.species}
              />

              <InputField 
                label="PL Stocked" 
                name="plStocked" 
                type="number" 
                placeholder="e.g., 100000" 
                helpText="Number of post-larvae stocked"
                value={form.plStocked}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.plStocked}
              />

              <InputField 
                label="Initial Shrimp Age (Days)" 
                name="shrimpAge" 
                type="number" 
                placeholder="e.g., 10" 
                helpText="Age of PL at stocking time"
                value={form.shrimpAge}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.shrimpAge}
              />
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Pond Size <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="number" 
                    name="pondSize" 
                    value={form.pondSize} 
                    onChange={handleChange} 
                    onBlur={handleBlur} 
                    placeholder="e.g., 2.5" 
                    className={`border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.pondSize ? "border-red-500 bg-red-50" : "border-gray-300"}`} 
                  />
                  <select 
                    name="pondSizeUnit" 
                    value={form.pondSizeUnit} 
                    onChange={handleChange} 
                    className="border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="acre">Acre</option>
                    <option value="hectare">Hectare</option>
                    <option value="sqm">Square Meters</option>
                  </select>
                </div>
                {errors.pondSize && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><span>⚠</span> {errors.pondSize}</p>}
              </div>

              {/* Cultivation Type fixed as Biofloc Tank */}
              <InputField 
                label="Cultivation Type" 
                name="cultivationType" 
                options={[{ value: "Biofloc Tank", label: "Biofloc Tank" }]}
                value={form.cultivationType}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.cultivationType}
              />

              <InputField 
                label="Expected Survival Rate" 
                name="survivalRate" 
                type="number" 
                placeholder="e.g., 0.75" 
                helpText="Enter value between 0 and 1 (e.g., 0.75 = 75%)"
                value={form.survivalRate}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.survivalRate}
              />

              {/* Feed Brand dropdown */}
              <InputField 
                label="Feed Brand" 
                name="feedBrand" 
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

            <div className="mt-8 flex gap-4">
              <button onClick={handleCreateBatch} disabled={isSubmitting} className={`flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${isSubmitting ? "cursor-wait" : ""}`}>
                {isSubmitting ? "Creating..." : "✓ Create Batch"}
              </button>
              <button onClick={() => { setShowCreateForm(false); setErrors({}); }} className="px-8 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-semibold transition-all">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Batch List */}
        <div className="space-y-4">
          {batches.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-lg">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🦐</span>
              </div>
              <p className="text-xl font-semibold text-gray-700 mb-2">No batches yet</p>
              <p className="text-gray-500 mb-6">Start by creating your first shrimp batch</p>
              <button onClick={() => setShowCreateForm(true)} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl">
                + Create Your First Batch
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Active Batches ({batches.length})</h2>
              </div>
              {batches.map(batch => (
                <div key={batch.id} onClick={() => handleBatchClick(batch.id)} className="p-6 border-2 border-gray-200 rounded-2xl hover:shadow-2xl hover:border-blue-300 transition-all cursor-pointer bg-white group">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{batch.batchName}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(batch.status)}`}>{batch.status}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Species</p>
                          <p className="font-semibold text-gray-800">{batch.species || "N/A"}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Current Age</p>
                          <p className="font-semibold text-gray-800">{batch.currentShrimpAge || batch.shrimpAge} days</p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">PL Stocked</p>
                          <p className="font-semibold text-gray-800">{batch.plStocked?.toLocaleString()}</p>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Pond Size</p>
                          <p className="font-semibold text-gray-800">{batch.pondSize} {batch.pondSizeUnit}</p>
                        </div>
                        <div className="bg-pink-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Type</p>
                          <p className="font-semibold text-gray-800">{batch.cultivationType || "N/A"}</p>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Feed Brand</p>
                          <p className="font-semibold text-gray-800">{batch.feedBrand || "N/A"}</p>
                        </div>
                        <div className="bg-teal-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Survival Rate</p>
                          <p className="font-semibold text-gray-800">{batch.survivalRate ? `${(batch.survivalRate * 100).toFixed(0)}%` : "N/A"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-6 text-right">
                      <div className="bg-blue-600 group-hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
                        View Details →
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