"use client";

import React, { useRef, useState, useEffect } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { Upload, Download, Loader2, Wand2, RefreshCcw } from "lucide-react";

export default function VideoRemover() {
  const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [outputVideo, setOutputVideo] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [box, setBox] = useState({ x: 25, y: 25, w: 100, h: 50 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const initFFmpeg = async () => {
      const ff = new FFmpeg();
      ff.on("progress", ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
      await ff.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      setFfmpeg(ff);
      setLoaded(true);
    };

    initFFmpeg();
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoSrc(URL.createObjectURL(file));
      setOutputVideo(null);
      setProgress(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - box.x, y: e.clientY - box.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !videoRef.current) return;
    const maxX = videoRef.current.clientWidth - box.w;
    const maxY = videoRef.current.clientHeight - box.h;

    const newX = Math.max(0, Math.min(e.clientX - dragStart.current.x, maxX));
    const newY = Math.max(0, Math.min(e.clientY - dragStart.current.y, maxY));
    setBox((prev) => ({ ...prev, x: newX, y: newY }));
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const processVideo = async () => {
    if (!ffmpeg || !loaded || !videoFile || !videoRef.current) return;
    setProcessing(true);
    setProgress(0);

    try {
      const v = videoRef.current;
      const scaleX = v.videoWidth / v.clientWidth;
      const scaleY = v.videoHeight / v.clientHeight;

      const realX = Math.max(0, Math.round(box.x * scaleX));
      const realY = Math.max(0, Math.round(box.y * scaleY));
      const realW = Math.round(box.w * scaleX);
      const realH = Math.round(box.h * scaleY);

      await ffmpeg.writeFile("input.mp4", await fetchFile(videoFile));

      await ffmpeg.exec([
        "-i",
        "input.mp4",
        "-filter_complex",
        `[0:v]delogo=x=${realX}:y=${realY}:w=${realW}:h=${realH}:show=0[v]`,
        "-map",
        "[v]",
        "-map",
        "0:a?",
        "-c:v",
        "libx264",
        "-crf",
        "18",
        "-preset",
        "veryfast",
        "-c:a",
        "copy",
        "output.mp4",
      ]);

      const data = await ffmpeg.readFile("output.mp4");
      const url = URL.createObjectURL(
        new Blob([(data as Uint8Array).buffer], { type: "video/mp4" })
      );
      setOutputVideo(url);
    } catch (err) {
      console.error(err);
      alert("Error processing video. Try a smaller duration clip.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-indigo-400" />
            Video Watermark Remover
          </h2>
          <p className="text-xs text-zinc-400">Processed 100% locally on your device (HQ)</p>
        </div>
        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full">
          {loaded ? "Engine Ready" : "Loading Engine..."}
        </span>
      </div>

      {!videoSrc ? (
        <label className="border-2 border-dashed border-zinc-800 hover:border-zinc-600 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition bg-zinc-950/40">
          <Upload className="w-10 h-10 text-zinc-500 mb-2" />
          <p className="text-sm font-medium text-zinc-200">Tap to upload video</p>
          <p className="text-xs text-zinc-500 mt-1">MP4, WebM or MOV</p>
          <input type="file" accept="video/*" onChange={handleFile} className="hidden" />
        </label>
      ) : (
        <div className="space-y-4">
          <div
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="relative overflow-hidden rounded-xl bg-black border border-zinc-800 select-none text-center"
          >
            <video ref={videoRef} src={videoSrc} controls className="max-h-[380px] mx-auto block pointer-events-none" />

            <div
              onMouseDown={handleMouseDown}
              className="absolute border-2 border-red-500 bg-red-500/25 cursor-move flex items-center justify-center font-bold text-[10px] text-white"
              style={{
                top: `${box.y}px`,
                left: `${box.x}px`,
                width: `${box.w}px`,
                height: `${box.h}px`,
              }}
            >
              DRAG HERE
            </div>
          </div>

          <p className="text-xs text-zinc-400 text-center">
            Red box ko drag karke watermark ya text ke upar rakhein.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
              <span className="text-zinc-500">X Position</span>
              <input
                type="number"
                value={box.x}
                onChange={(e) => setBox({ ...box, x: Number(e.target.value) })}
                className="w-full bg-zinc-900 rounded p-1 text-white mt-1 border border-zinc-700"
              />
            </div>
            <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
              <span className="text-zinc-500">Y Position</span>
              <input
                type="number"
                value={box.y}
                onChange={(e) => setBox({ ...box, y: Number(e.target.value) })}
                className="w-full bg-zinc-900 rounded p-1 text-white mt-1 border border-zinc-700"
              />
            </div>
            <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
              <span className="text-zinc-500">Width</span>
              <input
                type="number"
                value={box.w}
                onChange={(e) => setBox({ ...box, w: Number(e.target.value) })}
                className="w-full bg-zinc-900 rounded p-1 text-white mt-1 border border-zinc-700"
              />
            </div>
            <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
              <span className="text-zinc-500">Height</span>
              <input
                type="number"
                value={box.h}
                onChange={(e) => setBox({ ...box, h: Number(e.target.value) })}
                className="w-full bg-zinc-900 rounded p-1 text-white mt-1 border border-zinc-700"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setVideoSrc(null);
                setOutputVideo(null);
              }}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
            <button
              onClick={processVideo}
              disabled={processing || !loaded}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rendering Video ({progress}%)
                </>
              ) : (
                "Remove Watermark & Save"
              )}
            </button>
          </div>
        </div>
      )}

      {outputVideo && (
        <div className="mt-6 p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col items-center">
          <p className="text-xs text-emerald-400 font-semibold mb-2">Done! Processed Video:</p>
          <video src={outputVideo} controls className="max-h-[300px] rounded-lg mb-3" />
          <a
            href={outputVideo}
            download="cleaned_video.mp4"
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-sm flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4" /> Download Clean Video
          </a>
        </div>
      )}
    </div>
  );
}
