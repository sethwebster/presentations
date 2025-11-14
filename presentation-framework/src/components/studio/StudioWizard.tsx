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

const imageSourceOptions = [
  { value: "generate", label: "Generate with AI", description: "Create custom images using Flux AI" },
  { value: "none", label: "No Images", description: "Use solid colors and gradients only" },
];

export const StudioWizard: React.FC<{
  onComplete?: (deckId: string) => void;
  onCancel?: () => void;
}> = ({ onComplete, onCancel }) => {
  const [formData, setFormData] = useState<Partial<StudioInputs & { imageSource: string; enableVisualCritique: boolean; enableBraintrust: boolean }>>({
    topic: "",
    audience: "",
    tone: "inspirational",
    goal: "",
    duration_minutes: 10,
    design_language: "Cinematic",
    imageSource: "generate",
    enableVisualCritique: false,
    enableBraintrust: false,
  });

  const { generate, cancel, isGenerating, progress, result, error, visualCritiques, runVisualCritique } = useStudioGeneration({
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

  const handleChange = (field: keyof (StudioInputs & { imageSource: string; enableVisualCritique: boolean; enableBraintrust: boolean }), value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-8">
      <div className="w-full max-w-4xl mx-auto px-8 space-y-8">
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

          {/* Image Source */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold">Background Images</label>
            <div className="grid grid-cols-2 gap-4">
              {imageSourceOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    formData.imageSource === opt.value
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handleChange("imageSource", opt.value)}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-sm text-gray-600">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Braintrust Multi-Axis Critique Option */}
          <div className="space-y-2">
            <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:border-purple-300 transition-all">
              <input
                type="checkbox"
                className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                checked={formData.enableBraintrust || false}
                onChange={(e) => handleChange("enableBraintrust", e.target.checked)}
              />
              <div className="flex-1">
                <div className="font-semibold text-sm flex items-center gap-2">
                  Enable Braintrust Multi-Axis Critique
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">New</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Pixar-style critique system with 3-axis scoring (Narrative, Visual, Brand).
                  4-pass generation + refinement loop until quality threshold is met.
                </div>
                <div className="text-xs text-purple-600 mt-2 flex gap-3">
                  <span>📖 Narrative coherence</span>
                  <span>🎨 Visual hierarchy</span>
                  <span>🎯 Brand fidelity</span>
                </div>
              </div>
            </label>
          </div>

          {/* Visual Critique Option - Only show if Braintrust is disabled */}
          {!formData.enableBraintrust && (
            <div className="space-y-2">
              <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:border-blue-300 transition-all">
                <input
                  type="checkbox"
                  className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  checked={formData.enableVisualCritique || false}
                  onChange={(e) => handleChange("enableVisualCritique", e.target.checked)}
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm">Enable AI Visual Critique (Beta)</div>
                  <div className="text-sm text-gray-600 mt-1">
                    After generation, AI will analyze each slide for design quality, accessibility, and visual hierarchy.
                    Results will be displayed with actionable feedback.
                  </div>
                </div>
              </label>
            </div>
          )}

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

            {(result as any).visualCritiqueRequested && !visualCritiques && (
              <div className="pt-4 border-t">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="font-semibold mb-2 flex items-center gap-2">
                    <span>📊 Visual Critique Ready</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">
                    Open your presentation to run AI visual analysis. The system will analyze each slide for design quality, accessibility, and visual hierarchy.
                  </p>
                  <button
                    onClick={() => {
                      const deckId = (result as any).deckId;
                      if (deckId) {
                        window.location.href = `/editor/${deckId}`;
                      }
                    }}
                    className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Presentation & Run Critique
                  </button>
                </div>
              </div>
            )}

            {visualCritiques && visualCritiques.length > 0 && (
              <div className="pt-4 border-t">
                <div className="font-semibold mb-3 flex items-center gap-2">
                  <span>AI Visual Critique</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Beta</span>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {visualCritiques.map((critique, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">Slide {idx + 1}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Score:</span>
                          <span className={`font-bold ${
                            critique.overallScore >= 8 ? 'text-green-600' :
                            critique.overallScore >= 6 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {critique.overallScore}/10
                          </span>
                        </div>
                      </div>

                      {critique.issues && critique.issues.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-medium mb-1">Issues:</div>
                          <ul className="space-y-1">
                            {critique.issues.map((issue: any, issueIdx: number) => (
                              <li key={issueIdx} className="text-sm">
                                <span className={`inline-block w-16 font-medium ${
                                  issue.severity === 'high' ? 'text-red-600' :
                                  issue.severity === 'medium' ? 'text-yellow-600' :
                                  'text-blue-600'
                                }`}>
                                  [{issue.severity}]
                                </span>
                                <span className="text-gray-700">{issue.description}</span>
                                <div className="ml-16 text-gray-600 text-xs mt-1">
                                  → {issue.suggestion}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {critique.strengths && critique.strengths.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-medium mb-1 text-green-700">Strengths:</div>
                          <ul className="space-y-1">
                            {critique.strengths.map((strength: string, sIdx: number) => (
                              <li key={sIdx} className="text-sm text-gray-700">✓ {strength}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
