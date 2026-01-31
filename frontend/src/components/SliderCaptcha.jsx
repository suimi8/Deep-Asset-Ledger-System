import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, Check } from 'lucide-react';

export default function SliderCaptcha({ onVerify, onClose, encryptionKey }) {
    const [position, setPosition] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [verified, setVerified] = useState(false);
    const [targetX, setTargetX] = useState(0);
    const [trajectory, setTrajectory] = useState([]);

    const canvasRef = useRef(null);
    const blockRef = useRef(null);
    const containerRef = useRef(null);

    // Background images
    const IMAGES = [
        '/captcha/bg1.png',
        '/captcha/bg2.png',
        '/captcha/bg3.png'
    ];

    // Initialize puzzle
    useEffect(() => {
        initPuzzle();
    }, []);

    const getRandomImage = () => {
        return IMAGES[Math.floor(Math.random() * IMAGES.length)];
    };

    const initPuzzle = () => {
        const canvas = canvasRef.current;
        const block = blockRef.current;
        if (!canvas || !block) return;

        const ctx = canvas.getContext('2d');
        const blockCtx = block.getContext('2d');

        const width = 320;
        const height = 160;

        // Reset
        ctx.clearRect(0, 0, width, height);
        blockCtx.clearRect(0, 0, width, height);
        setPosition(0);
        setVerified(false);

        // 1. Load Image
        const img = new Image();
        img.src = getRandomImage();
        img.crossOrigin = "Anonymous";

        img.onload = () => {
            // Random target position
            const minX = 150;
            const maxX = width - 60;
            const targetXVal = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
            setTargetX(targetXVal);
            const targetYVal = Math.floor(Math.random() * (height - 60)) + 10;

            // 2. Draw Main Image
            ctx.drawImage(img, 0, 0, width, height);

            // 3. Draw "Hole"
            const size = 50;
            drawPuzzleShape(ctx, targetXVal, targetYVal, size, true);

            // 4. Draw "Piece" on Block Canvas
            blockCtx.clearRect(0, 0, width, height);
            blockCtx.save();

            const startX = 10;
            drawPuzzleShape(blockCtx, startX, targetYVal, size, false);
            blockCtx.clip();

            blockCtx.drawImage(img, startX - targetXVal, 0, width, height);

            blockCtx.restore();

            // Draw border around the piece
            blockCtx.save();
            drawPuzzleShape(blockCtx, startX, targetYVal, size, false);
            blockCtx.lineWidth = 2;
            blockCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            blockCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            blockCtx.shadowBlur = 10;
            blockCtx.stroke();
            blockCtx.restore();
        };
    };

    const drawPuzzleShape = (ctx, x, y, size, isHole = false) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + size / 2 - 10, y);
        ctx.arc(x + size / 2, y - 10 + 10, 10, 1.5 * Math.PI, 0.5 * Math.PI); // Top tab
        ctx.lineTo(x + size, y);
        ctx.lineTo(x + size, y + size / 2 - 10);
        ctx.arc(x + size + 10 - 10, y + size / 2, 10, Math.PI, 2 * Math.PI); // Right tab
        ctx.lineTo(x + size, y + size);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x, y);
        ctx.closePath();

        if (isHole) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.stroke();
        }
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setTrajectory([{
            x: e.clientX || e.touches[0].clientX,
            y: e.clientY || e.touches[0].clientY,
            t: Date.now()
        }]);
    };

    const handleMouseMove = (e) => {
        if (!isDragging || verified) return;
        const container = containerRef.current.getBoundingClientRect();
        let clientX = e.clientX || e.touches[0].clientX;
        let clientY = e.clientY || e.touches[0].clientY;

        // Record trajectory
        setTrajectory(prev => [...prev, { x: clientX, y: clientY, t: Date.now() }]);

        let newPos = clientX - container.left - 25; // center offset
        if (newPos < 0) newPos = 0;
        if (newPos > 270) newPos = 270;
        setPosition(newPos);
    };

    const getCanvasFingerprint = () => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = "top";
            ctx.font = "14px 'Arial'";
            ctx.fillStyle = "#f60";
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = "#069";
            ctx.fillText("DeepLedger", 2, 15);
            return canvas.toDataURL().slice(-50);
        } catch (e) { return "unknown"; }
    };

    const encryptW = (text) => {
        // Dynamic Key Usage
        const key = encryptionKey || "DEEP_LEDGER_SEC";
        let result = "";
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(result);
    };

    const generateWParam = () => {
        const fingerprint = {
            ua: navigator.userAgent,
            lang: navigator.language,
            screen: `${window.screen.width}x${window.screen.height}`,
            canvas: getCanvasFingerprint()
        };
        const sampleRate = Math.ceil(trajectory.length / 20);
        const sampled = trajectory.filter((_, i) => i % sampleRate === 0);

        const payload = JSON.stringify({
            fp: fingerprint,
            tr: sampled,
            ts: Date.now(),
            Key: "deep_asset_ledger_v2"
        });
        return encryptW(payload);
    };

    const handleMouseUp = () => {
        if (!isDragging) return;
        setIsDragging(false);

        const diff = Math.abs(position - targetX + 10);
        if (diff < 5) {
            setVerified(true);
            const w = generateWParam();
            setTimeout(() => {
                onVerify(w);
            }, 500);
        } else {
            // Fail - reset
            const animateReset = () => {
                setPosition((prev) => {
                    if (prev <= 0) return 0;
                    return prev - 10;
                });
                if (position > 0) requestAnimationFrame(animateReset);
            };
            setPosition(0);
        }
    };

    // Global events
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('touchend', handleMouseUp);
            window.addEventListener('touchmove', handleMouseMove);
        }
        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
        };
    }, [isDragging, position]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl border border-white/10 w-[360px] relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <ShieldCheck className="text-blue-400" size={20} />
                    {verified ? '验证通过' : '安全验证'}
                </h3>

                <div className="relative w-[320px] h-[160px] rounded-lg overflow-hidden bg-black/50 mb-4 shadow-inner" ref={containerRef}>
                    <canvas ref={canvasRef} width={320} height={160} className="absolute top-0 left-0" />
                    <canvas
                        ref={blockRef}
                        width={320}
                        height={160}
                        className="absolute top-0 left-0 transition-transform duration-75"
                        style={{
                            transform: `translateX(${position}px)`,
                            cursor: 'grab'
                        }}
                    />
                </div>

                <div className="relative h-12 bg-[#0f172a] rounded-full border border-white/5 shadow-inner flex items-center px-1">
                    <div className="absolute left-0 top-0 h-full bg-blue-500/10 rounded-full border-r border-blue-500/30" style={{ width: `${position + 40}px` }} />

                    <p className={`text-center w-full text-xs font-medium transition-opacity duration-300 ${isDragging ? 'opacity-0' : 'opacity-50 text-gray-400'}`}>
                        {verified ? '验证成功' : '向右滑动完成拼图'}
                    </p>

                    <div
                        className={`absolute top-1 bottom-1 w-14 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg transition-colors duration-200 z-10
                    ${verified ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]'}
                `}
                        style={{ left: `${position}px`, transition: isDragging ? 'none' : 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleMouseDown}
                    >
                        {verified ? <Check className="text-white" size={20} /> : <div className="w-6 h-6 border-2 border-white/30 rounded-full" />}
                    </div>
                </div>
            </div>
        </div>
    );
}
