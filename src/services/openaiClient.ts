export async function sendAiCoachMessage(input: string, context: string) {
  const apiKey = localStorage.getItem("openai_api_key");
  const projectId = localStorage.getItem("openai_project_id");

  if (!apiKey) {
    throw new Error("OpenAI API Key가 설정되지 않았습니다.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(projectId ? { "OpenAI-Project": projectId } : {}),
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are a concise Korean fitness coach. Use the health context and answer in Korean with practical short guidance.",
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
    throw new Error(`OpenAI 요청 실패: ${errorText}`);
  }

  const json = await response.json();
  return (
    json.output_text ||
    json.output?.flatMap((item: any) => item.content || []).find((content: any) => content.type === "output_text")?.text ||
    "답변을 생성하지 못했습니다."
  );
}
