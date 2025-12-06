import { GoogleGenAI, Type } from "@google/genai";
import { Patient } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Analyzes an Audiogram image to extract numerical data.
 * Uses gemini-3-pro-preview for high reasoning image analysis.
 */
export const analyzeAudiogramImage = async (base64Image: string, mimeType: string) => {
  try {
    const prompt = `
      Analyze this Pure Tone Audiometry (PTA) image.
      Extract the hearing thresholds (in dB HL) for both Air Conduction and Bone Conduction at frequencies: 500Hz, 1kHz, 2kHz, and 4kHz.
      
      Look for standard symbols:
      - Right Ear Air: O (Red)
      - Left Ear Air: X (Blue)
      - Right Ear Bone: < or [
      - Left Ear Bone: > or ]
      
      Return ONLY a JSON object with this structure:
      {
        "right": {
          "airConduction": { "f500": number, "f1k": number, "f2k": number, "f4k": number },
          "boneConduction": { "f500": number, "f1k": number, "f2k": number, "f4k": number }
        },
        "left": {
           "airConduction": { "f500": number, "f1k": number, "f2k": number, "f4k": number },
           "boneConduction": { "f500": number, "f1k": number, "f2k": number, "f4k": number }
        }
      }
      If a value is not clearly visible or not recorded, use -1.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json'
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error analyzing audiogram:", error);
    throw error;
  }
};

/**
 * Performs deep analysis on the dataset using Thinking Mode.
 * Uses gemini-3-pro-preview with high thinking budget.
 */
export const generateThesisAnalysis = async (patients: Patient[]) => {
  try {
    // Sanitize data to reduce token count but keep essential stats
    const dataset = patients.map(p => ({
      group: p.group,
      age: p.age,
      diagnosis: p.diagnosis,
      operatedEar: p.operatedEar,
      // Extract metrics specifically for the operated ear
      preOpABG: p.operatedEar === 'Right' ? p.preOpAudiometry.right.airBoneGap : p.preOpAudiometry.left.airBoneGap,
      postOp12wABG: p.operatedEar === 'Right' ? p.postOp12WeeksAudiometry.right.airBoneGap : p.postOp12WeeksAudiometry.left.airBoneGap,
      graftStatus_12w: p.operatedEar === 'Right' ? p.postOp12WeeksOtoscopy.right.graftUptake : p.postOp12WeeksOtoscopy.left.graftUptake
    }));

    const prompt = `
      Act as a senior medical biostatistician writing a formal research paper.
      Title: "GRAFT UPTAKE AND HEARING OUTCOMES IN ENDOSCOPIC CARTILAGE MYRINGOPLASTY: TYMPANOMEATAL FLAP ELEVATION (TFG) VERSUS NON-ELEVATION (NTFG)".
      
      Here is the clinical dataset of ${patients.length} patients:
      ${JSON.stringify(dataset, null, 2)}
      
      Please generate a **formal academic analysis report**. Structure the output exactly as follows:

      # [Title of the Study]

      ## Abstract
      A concise summary of the objective, methods (N=${patients.length}), key results, and conclusion.

      ## Methodology
      Briefly describe the comparative study design (TFG vs NTFG) and the parameters analyzed (Graft Uptake at 12 weeks, Air-Bone Gap closure).

      ## Results
      Provide a detailed statistical breakdown.
      *   **Demographics**: Age/Sex distribution.
      *   **Graft Uptake**: Compare success rates between TFG and NTFG. **Present this data in a Markdown Table.**
      *   **Hearing Outcomes**: Compare Pre-op vs Post-op (12 weeks) Air-Bone Gap (ABG) for both groups. Calculate mean improvement. **Present this data in a Markdown Table.**

      ## Discussion
      Interpret the findings. Are there observed differences between the techniques? How do these results compare to general expectations in otology? Discuss any trends in the data.

      ## Conclusion
      A final authoritative statement on whether one technique showed superiority based on this specific dataset.

      **Tone:** Formal, objective, academic.
      **Format:** Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 } // Max thinking for deep analysis
      }
    });

    return response.text;
  } catch (error) {
    console.error("Error generating analysis:", error);
    throw error;
  }
};

/**
 * Searches medical literature for grounding.
 * Uses gemini-2.5-flash with Google Search tool.
 */
export const searchMedicalLiterature = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Search for recent medical literature or guidelines regarding: ${query}. Summarize key findings relevant to endoscopic myringoplasty.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    
    return {
      text: response.text,
      groundingMetadata: response.candidates?.[0]?.groundingMetadata
    };
  } catch (error) {
    console.error("Error searching literature:", error);
    throw error;
  }
};

/**
 * Edits an uploaded medical image based on text prompt.
 * Uses gemini-2.5-flash-image (Nano Banana).
 */
export const editMedicalImage = async (base64Image: string, mimeType: string, prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: prompt }
        ]
      }
    });

    // Check for image in response parts
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};