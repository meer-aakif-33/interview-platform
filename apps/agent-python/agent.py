import asyncio
import os
import re
import json
from dotenv import load_dotenv

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli
from livekit.agents.voice import VoiceAgent

import google.generativeai as genai

load_dotenv()

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

SYSTEM_PROMPT = """
You are a senior software engineer conducting a real coding interview.

Rules:
- Ask follow-up questions
- Challenge edge cases
- Ask complexity questions
- Do NOT give solutions
- Be concise and natural
"""

QUESTION = (
    "Given an array of integers, return indices of two numbers "
    "that add up to a target."
)

async def publish(room, payload):
    await room.local_participant.publish_data(
        json.dumps(payload).encode("utf-8"),
        reliable=True
    )

async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    session_id = ctx.room.name
    print("Interview session:", session_id)

    agent = VoiceAgent(
        vad=True,
        stt="deepgram",
        tts="elevenlabs",
        llm="gemini",
        system_prompt=SYSTEM_PROMPT,
    )

    agent.start(ctx.room)

    await agent.say(QUESTION)
    await publish(ctx.room, {
        "type": "transcript",
        "speaker": "AGENT",
        "text": QUESTION,
        "final": True
    })

    async for msg in agent.listen():
        text = msg.text.strip()
        print("Candidate:", text)

        await publish(ctx.room, {
            "type": "transcript",
            "speaker": "CANDIDATE",
            "text": text,
            "final": True
        })

        if re.search(r"end (the )?interview|i'?m done", text, re.I):
            goodbye = "Alright, ending the interview. Thank you."
            await agent.say(goodbye)
            await publish(ctx.room, {
                "type": "transcript",
                "speaker": "AGENT",
                "text": goodbye,
                "final": True
            })

            await publish(ctx.room, {
                "type": "control",
                "action": "INTERVIEW_ENDED"
            })
            break

        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(
            f"""
You are an interviewer.

Candidate said:
{text}

Ask a follow-up question.
"""
        )

        reply = response.text.strip()

        await agent.say(reply)
        await publish(ctx.room, {
            "type": "transcript",
            "speaker": "AGENT",
            "text": reply,
            "final": True
        })

    await ctx.shutdown()

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="interviewer-agent"
        )
    )
