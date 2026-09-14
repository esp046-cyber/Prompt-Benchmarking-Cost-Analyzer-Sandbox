/* eval.js — sends each model's output to a judge model and asks for a 1-10
   score plus a one-sentence critique. It does not know about fetch/CORS
   routing itself: index.html injects a `callModelFn(modelKey, systemPrompt,
   userPrompt) -> Promise<{ text, error }>` so this file stays provider-agnostic.
*/

function buildRubricPrompt(systemPromptUsed, testDatasetUsed, candidateOutput) {
  return [
    "You are a strict but fair evaluator grading an AI model's response.",
    "",
    "The model was given this system prompt:",
    "---",
    systemPromptUsed || "(none)",
    "---",
    "",
    "And this input:",
    "---",
    testDatasetUsed || "(none)",
    "---",
    "",
    "It produced this response:",
    "---",
    candidateOutput || "(empty response)",
    "---",
    "",
    "Score the response from 1 to 10 on how well it follows instructions,",
    "how accurate/useful it is, and whether formatting and tone fit the ask.",
    "Reply with ONLY compact JSON, no markdown fences, no extra text:",
    '{"score": <integer 1-10>, "critique": "<one sentence, under 25 words>"}'
  ].join("\n");
}

function parseJudgeReply(raw) {
  if (!raw) return { score: null, critique: "Judge returned no output." };
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "");
  try {
    const parsed = JSON.parse(cleaned);
    const score = Number(parsed.score);
    return {
      score: Number.isFinite(score) ? Math.max(1, Math.min(10, Math.round(score))) : null,
      critique: String(parsed.critique || "").slice(0, 300)
    };
  } catch {
    // Fall back to a loose regex scrape if the judge didn't return clean JSON.
    const scoreMatch = cleaned.match(/(\d{1,2})\s*\/\s*10|"score"\s*:\s*(\d{1,2})/);
    const score = scoreMatch ? Number(scoreMatch[1] || scoreMatch[2]) : null;
    return {
      score: Number.isFinite(score) ? Math.max(1, Math.min(10, score)) : null,
      critique: cleaned.slice(0, 200) || "Could not parse judge output."
    };
  }
}

/**
 * @param {Object} args
 * @param {string} args.judgeModelKey - key into pricing.json models
 * @param {(modelKey:string, systemPrompt:string, userPrompt:string)=>Promise<{text:string,error?:string}>} args.callModelFn
 * @param {string} args.systemPrompt
 * @param {string} args.testDataset
 * @param {Array<{modelKey:string,label:string,responseText:string,error?:string}>} args.results
 * @returns {Promise<Array<{score:number|null, critique:string}|null>>} aligned with args.results
 */
async function evaluateWithJudge({ judgeModelKey, callModelFn, systemPrompt, testDataset, results }) {
  const jobs = results.map(async (r) => {
    if (r.error || !r.responseText) return { score: null, critique: "Skipped — model errored, nothing to judge." };
    const rubric = buildRubricPrompt(systemPrompt, testDataset, r.responseText);
    try {
      const judgeReply = await callModelFn(judgeModelKey, "You are a precise, terse grading assistant.", rubric);
      if (judgeReply.error) return { score: null, critique: `Judge error: ${judgeReply.error}` };
      return parseJudgeReply(judgeReply.text);
    } catch (err) {
      return { score: null, critique: `Judge error: ${err.message}` };
    }
  });
  return Promise.all(jobs);
}

window.BenchEval = { evaluateWithJudge };
