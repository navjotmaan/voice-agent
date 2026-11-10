'use client'
import { useState } from "react";

export default function DataInput () {
    const [text, setText] = useState("Write the knowledge base for your agent here.");

    async function sendData(data:String) {
        const res = await fetch('http://localhost:8000/api/save-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: data }),
        });

        console.log(res)
    }
    return(
        <div className="w-full max-w-[50%] flex flex-col gap-3 m-auto">
            <textarea value={text} onChange={(e) => setText(e.target.value)}
                rows={18}
                className=" rounded-md border-2 border-violet-400/50 p-2.5 text-sm focus:border-violet-300/70 focus:outline-none"
            >
            </textarea>
            <button onClick={() => sendData(text)} className="border-violet-400/50 bg-violet-950/30 text-violet-100 shadow-[0_0_18px_2px_rgba(168,85,247,0.35)] hover:border-violet-300/70 hover:shadow-[0_0_26px_4px_rgba(168,85,247,0.55)] overflow-hidden rounded-2xl border px-4 py-2.5 text-sm font-semibold tracking-wide backdrop-blur-md transition-all duration-300 ease-out active:scale-95 w-30 rounded-lg p-1 cursor-pointer">Save</button>
        </div>
    )
}