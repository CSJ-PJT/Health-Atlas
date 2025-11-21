import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { healthData } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const OPENAI_THREAD_ID = Deno.env.get('OPENAI_THREAD_ID');
    
    if (!OPENAI_API_KEY || !OPENAI_THREAD_ID) {
      throw new Error('Missing OpenAI credentials');
    }

    // Format health data message
    const message = formatHealthData(healthData);
    
    // Send message to OpenAI thread
    const response = await fetch(
      `https://api.openai.com/v1/threads/${OPENAI_THREAD_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2',
        },
        body: JSON.stringify({
          role: 'user',
          content: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Data sent successfully to OpenAI thread:', result.id);

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-health-data function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatHealthData(data: any): string {
  const sections = [];
  const date = new Date().toLocaleDateString('ko-KR');
  
  sections.push(`📊 삼성헬스 데이터 (${date})`);
  sections.push('');

  if (data.exercise && data.exercise.length > 0) {
    sections.push('🏃 운동 기록:');
    data.exercise.forEach((ex: any, i: number) => {
      sections.push(`  ${i + 1}. ${ex.type || '운동'}: ${ex.duration || 0}분, ${ex.calories || 0}kcal`);
    });
    sections.push('');
  }

  if (data.running && data.running.length > 0) {
    sections.push('🏃‍♂️ 러닝 기록:');
    data.running.forEach((run: any, i: number) => {
      sections.push(`  ${i + 1}. 거리: ${run.distance || 0}km, 시간: ${run.duration || 0}분, 칼로리: ${run.calories || 0}kcal`);
    });
    sections.push('');
  }

  if (data.sleep && data.sleep.length > 0) {
    sections.push('😴 수면 기록:');
    data.sleep.forEach((sleep: any, i: number) => {
      sections.push(`  ${i + 1}. 수면시간: ${sleep.duration || 0}시간, 깊은수면: ${sleep.deepSleep || 0}시간`);
    });
    sections.push('');
  }

  if (data.bodyComposition && data.bodyComposition.length > 0) {
    sections.push('⚖️ 체성분 기록:');
    data.bodyComposition.forEach((body: any, i: number) => {
      sections.push(`  ${i + 1}. 체중: ${body.weight || 0}kg, 체지방률: ${body.bodyFat || 0}%, 근육량: ${body.muscleMass || 0}kg`);
    });
    sections.push('');
  }

  if (data.nutrition && data.nutrition.length > 0) {
    sections.push('🍽️ 음식 및 영양 기록:');
    data.nutrition.forEach((meal: any, i: number) => {
      sections.push(`  ${i + 1}. ${meal.name || '식사'}: ${meal.calories || 0}kcal, 탄수화물: ${meal.carbs || 0}g, 단백질: ${meal.protein || 0}g, 지방: ${meal.fat || 0}g`);
    });
    sections.push('');
  }

  return sections.join('\n');
}
