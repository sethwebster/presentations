/**
 * Studio Wizard Component
 * UI for generating award-quality presentations using Lume Studio
 */

"use client";

import React, { useState } from "react";
import { useStudioGeneration } from "../../hooks/useStudioGeneration";
import type { StudioInputs } from "../../ai/studio/payloadBuilders";

const toneOptions = [
  { value: "inspirational", label: "Inspirational" },
  { value: "analytical", label: "Analytical" },
  { value: "educational", label: "Educational" },
  { value: "persuasive", label: "Persuasive" },
];

const designLanguageOptions = [
  { value: "Cinematic", label: "Cinematic", description: "Dramatic, high-contrast visuals" },
  { value: "Apple", label: "Apple", description: "Clean, minimalist elegance" },
  { value: "Editorial", label: "Editorial", description: "Sophisticated, magazine-style" },
  { value: "Minimal", label: "Minimal", description: "Pure, restrained aesthetic" },
];

export const StudioWizard: React.FC<{
  onComplete?: (deckId: string) => void;
  onCancel?: () => void;
}> = ({ onComplete, onCancel }) => {
  const [formData, setFormData] = useState<Partial<StudioInputs>>({
    topic: "",
    audience: "",
    tone: "inspirational",
    goal: "",
    duration_minutes: 10,
    design_language: "Cinematic",
  });

  const { generate, cancel, isGenerating, progress, result, error } = useStudioGeneration({
    onComplete: async (result) => {
      console.log("Generation complete!", result);

      // Deck was saved server-side, just use the returned deck ID
      const deckId = (result as any).deckId;

      if (!deckId) {
        console.error("No deck ID received from server");
        alert("Generation completed but no deck ID was returned. Please try again.");
        return;
      }

      console.log(`[StudioWizard] Deck saved with ID: ${deckId}`);
      onComplete?.(deckId);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.topic || !formData.audience || !formData.goal) {
      alert("Please fill in all required fields");
      return;
    }

    await generate(formData as StudioInputs);
  };

  const handleChange = (field: keyof StudioInputs, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl mx-auto p-8 space-y-8 my-8">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white">Lume Studio</h1>
          <p className="text-lg text-gray-300">
            Generate award-quality presentations with AI-powered design intelligence
          </p>
        </div>
        {!isGenerating && onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {!isGenerating && !result && (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl p-8 shadow-2xl">
          {/* Topic */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold">
              Presentation Topic *
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., The Future of Sustainable AI"
              value={formData.topic || ""}
              onChange={(e) => handleChange("topic", e.target.value)}
              required
            />
          </div>

          {/* Audience */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold">
              Target Audience *
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Tech conference attendees, executives, students"
              value={formData.audience || ""}
              onChange={(e) => handleChange("audience", e.target.value)}
              required
            />
          </div>

          {/* Goal */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold">
              Presentation Goal *
            </label>
            <textarea
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Convince audience of AI's role in climate sustainability"
              value={formData.goal || ""}
              onChange={(e) => handleChange("goal", e.target.value)}
              rows={3}
              required
            />
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold">Tone</label>
            <select
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.tone || "inspirational"}
              onChange={(e) => handleChange("tone", e.target.value)}
            >
              {toneOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold">
              Duration (minutes)
            </label>
            <input
              type="number"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.duration_minutes || 10}
              onChange={(e) => handleChange("duration_minutes", parseInt(e.target.value))}
              min={5}
              max={60}
            />
          </div>

          {/* Design Language */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold">Design Language</label>
            <div className="grid grid-cols-2 gap-4">
              {designLanguageOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    formData.design_language === opt.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handleChange("design_language", opt.value)}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-sm text-gray-600">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Generate Presentation
          </button>
        </form>
      )}

      {isGenerating && progress && (
        <div className="space-y-6 p-8 bg-white rounded-2xl shadow-2xl">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold capitalize">{progress.phase}</h3>
              <span className="text-sm text-gray-600">{progress.progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">{progress.message}</p>
          </div>

          <button
            onClick={cancel}
            className="w-full py-3 border-2 border-red-500 text-red-500 font-semibold rounded-lg hover:bg-red-50 transition-colors"
          >
            Cancel Generation
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-6 p-8 bg-white rounded-2xl shadow-2xl">
          <h3 className="text-2xl font-bold text-green-900">
            ✓ Presentation Generated!
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold">Quality Score</div>
                <div className="text-2xl font-bold text-green-600">
                  {result.metadata.finalScore.toFixed(1)}/10
                </div>
              </div>
              <div>
                <div className="font-semibold">Slides</div>
                <div className="text-2xl font-bold">
                  {result.deck.presentation.slides.length}
                </div>
              </div>
              <div>
                <div className="font-semibold">Design Language</div>
                <div className="text-lg">{result.deck.presentation.design_language}</div>
              </div>
              <div>
                <div className="font-semibold">Accessibility</div>
                <div className="text-lg capitalize">
                  {result.metadata.accessibilityReport.overallScore}
                </div>
              </div>
            </div>

            <div className="pt-4">
              <div className="font-semibold mb-2">Theme</div>
              <p className="text-gray-700">{result.deck.presentation.theme}</p>
            </div>

            {result.critique && result.critique.feedback.length > 0 && (
              <div className="pt-4">
                <div className="font-semibold mb-2">Design Feedback</div>
                <ul className="space-y-2">
                  {result.critique.feedback.map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-700">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            Generate Another
          </button>
        </div>
      )}

      {error && (
        <div className="p-6 bg-white border-2 border-red-200 rounded-2xl shadow-2xl">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Generation Failed
          </h3>
          <p className="text-sm text-red-700">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
      </div>
    </div>
  );
};
