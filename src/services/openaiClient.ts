const DEFAULT_MODEL = "gpt-4.1-mini";
const DEFAULT_TIMEOUT_MS = 25000;

type ResponseContent =
  | { type: "input_text"; text: string }
  | { type: "output_text"; text: string }
  | { type: string; text?: string };

type ResponseItem = {
  content?: ResponseContent[];
};

function getApiKey() {
  const apiKey = localStorage.getItem("openai_api_key");
  if (!apiKey) {
    throw new Error("OpenAI API Key가 설정되지 않았습니다.");
  }
  return apiKey;
}

function getProjectId() {
  return localStorage.getItem("openai_project_id");
}

export function getOpenAiModel() {
  return localStorage.getItem("openai_model") || DEFAULT_MODEL;
}

function parseResponseText(json: { output_text?: string; output?: ResponseItem[] }) {
  if (json.output_text) {
    return json.output_text;
  }

  const flattened = (json.output || []).flatMap((item) => item.content || []);
  const text = flattened
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text?.trim() || "")
    .filter(Boolean)
    .join("\n");

  return text || "응답을 생성하지 못했습니다.";
}

export async function sendAiCoachMessage(input: string, context: string) {
  const apiKey = getApiKey();
  const projectId = getProjectId();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(projectId ? { "OpenAI-Project": projectId } : {}),
      },
      body: JSON.stringify({
        model: getOpenAiModel(),
        temperature: 0.7,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "You are a concise Korean fitness coach. Use the health context and answer in Korean with practical, safe, actionable guidance.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `건강 데이터 컨텍스트:\n${context}\n\n질문:\n${input}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI 요청 실패: ${response.status} ${errorText}`);
    }

    const json = await response.json();
    return parseResponseText(json);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("OpenAI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
    }
    throw error instanceof Error ? error : new Error("OpenAI 요청 중 알 수 없는 오류가 발생했습니다.");
  } finally {
    window.clearTimeout(timeout);
  }
}
