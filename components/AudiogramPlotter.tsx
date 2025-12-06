import React, { useRef, useState, useEffect } from 'react';
import { Frequencies } from '../types';

interface AudiogramPlotterProps {
    airConduction: Frequencies;
    boneConduction: Frequencies;
    side: 'right' | 'left';
    onChange: (type: 'airConduction' | 'boneConduction', freq: keyof Frequencies, value: number) => void;
    readOnly?: boolean;
}

const FREQUENCIES = [
    { label: '125', value: 125, key: null }, // Placeholder for grid
    { label: '250', value: 250, key: null }, // Placeholder for grid
    { label: '500', value: 500, key: 'f500' },
    { label: '1k', value: 1000, key: 'f1k' },
    { label: '2k', value: 2000, key: 'f2k' },
    { label: '4k', value: 4000, key: 'f4k' },
    { label: '8k', value: 8000, key: null }, // Placeholder for grid
];

const DECIBELS = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

const AudiogramPlotter: React.FC<AudiogramPlotterProps> = ({ airConduction, boneConduction, side, onChange, readOnly = false }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [dragging, setDragging] = useState<{ type: 'airConduction' | 'boneConduction', freq: keyof Frequencies } | null>(null);

    // Dimensions
    const width = 400;
    const height = 400;
    const padding = { top: 40, right: 40, bottom: 40, left: 50 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Scales
    const getX = (freqIndex: number) => padding.left + (freqIndex * (graphWidth / (FREQUENCIES.length - 1)));
    const getY = (db: number) => padding.top + ((db + 10) * (graphHeight / 130));

    // Inverse Scales (for interaction)
    const getDbFromY = (y: number) => {
        const relativeY = y - padding.top;
        const db = (relativeY / (graphHeight / 130)) - 10;
        return Math.round(db / 5) * 5; // Snap to nearest 5dB
    };

    const handleMouseDown = (type: 'airConduction' | 'boneConduction', freq: keyof Frequencies) => {
        if (!readOnly) {
            setDragging({ type, freq });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (dragging && svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const db = Math.max(-10, Math.min(120, getDbFromY(y)));
            onChange(dragging.type, dragging.freq, db);
        }
    };

    const handleMouseUp = () => {
        setDragging(null);
    };

    // Global mouse up to catch drag release outside SVG
    useEffect(() => {
        const handleGlobalMouseUp = () => setDragging(null);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    const renderGrid = () => (
        <g className="grid opacity-20">
            {/* Vertical Lines (Frequencies) */}
            {FREQUENCIES.map((f, i) => (
                <line
                    key={`v-${f.value}`}
                    x1={getX(i)}
                    y1={padding.top}
                    x2={getX(i)}
                    y2={height - padding.bottom}
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray={f.key ? "" : "4 4"}
                />
            ))}
            {/* Horizontal Lines (dB) */}
            {DECIBELS.map((db) => (
                <line
                    key={`h-${db}`}
                    x1={padding.left}
                    y1={getY(db)}
                    x2={width - padding.right}
                    y2={getY(db)}
                    stroke="currentColor"
                    strokeWidth={db === 0 ? "2" : "1"}
                />
            ))}
        </g>
    );

    const renderLabels = () => (
        <g className="labels text-xs font-medium fill-gray-500 select-none">
            {/* X Axis */}
            {FREQUENCIES.map((f, i) => (
                <text key={`xl-${f.value}`} x={getX(i)} y={height - 10} textAnchor="middle">
                    {f.label}
                </text>
            ))}
            {/* Y Axis */}
            {DECIBELS.map((db) => (
                <text key={`yl-${db}`} x={padding.left - 10} y={getY(db) + 4} textAnchor="end">
                    {db}
                </text>
            ))}
            <text x={width / 2} y={15} textAnchor="middle" className="font-bold fill-gray-700 uppercase tracking-widest">
                Frequency (Hz)
            </text>
            <text x={15} y={height / 2} textAnchor="middle" transform={`rotate(-90, 15, ${height / 2})`} className="font-bold fill-gray-700 uppercase tracking-widest">
                Hearing Level (dB HL)
            </text>
        </g>
    );

    const renderPoints = (data: Frequencies, type: 'airConduction' | 'boneConduction') => {
        const color = side === 'right' ? '#ef4444' : '#3b82f6'; // Red for Right, Blue for Left
        const points: string[] = [];

        FREQUENCIES.forEach((f, i) => {
            if (f.key && data[f.key as keyof Frequencies] !== undefined) {
                const x = getX(i);
                const y = getY(data[f.key as keyof Frequencies] as number);
                points.push(`${x},${y}`);
            }
        });

        return (
            <g className={type}>
                {/* Connecting Line */}
                <polyline
                    points={points.join(' ')}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeDasharray={type === 'boneConduction' ? "5 5" : ""}
                    opacity="0.6"
                />

                {/* Interactive Points */}
                {FREQUENCIES.map((f, i) => {
                    if (!f.key) return null;
                    const val = data[f.key as keyof Frequencies];
                    if (val === undefined) return null;

                    const x = getX(i);
                    const y = getY(val as number);
                    const isHovered = dragging?.type === type && dragging?.freq === f.key;

                    return (
                        <g
                            key={`${type}-${f.key}`}
                            onMouseDown={() => handleMouseDown(type, f.key as keyof Frequencies)}
                            className={`${readOnly ? '' : 'cursor-grab active:cursor-grabbing'} transition-transform duration-75`}
                            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                        >
                            {/* Hit Area */}
                            <circle cx={x} cy={y} r={15} fill="transparent" />

                            {/* Symbol */}
                            {type === 'airConduction' ? (
                                side === 'right' ? (
                                    <circle cx={x} cy={y} r={5} stroke={color} strokeWidth="2" fill="white" />
                                ) : (
                                    <g transform={`translate(${x},${y})`}>
                                        <line x1="-4" y1="-4" x2="4" y2="4" stroke={color} strokeWidth="2" />
                                        <line x1="-4" y1="4" x2="4" y2="-4" stroke={color} strokeWidth="2" />
                                    </g>
                                )
                            ) : (
                                // Bone Conduction Symbols
                                <g transform={`translate(${x},${y})`}>
                                    {side === 'right' ? (
                                        <path d="M -4 -6 L -8 0 L -4 6" stroke={color} strokeWidth="2" fill="none" />
                                    ) : (
                                        <path d="M 4 -6 L 8 0 L 4 6" stroke={color} strokeWidth="2" fill="none" />
                                    )}
                                </g>
                            )}

                            {/* Value Label on Drag */}
                            {isHovered && (
                                <text x={x} y={y - 15} textAnchor="middle" className="text-xs font-bold fill-slate-700 pointer-events-none">
                                    {Math.round(val)}
                                </text>
                            )}
                        </g>
                    );
                })}
            </g>
        );
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 select-none">
            <svg
                ref={svgRef}
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto max-w-md mx-auto"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseUp}
            >
                {renderGrid()}
                {renderLabels()}
                {renderPoints(boneConduction, 'boneConduction')}
                {renderPoints(airConduction, 'airConduction')}
            </svg>
            <div className="flex justify-center gap-6 mt-4 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 border-2 ${side === 'right' ? 'border-red-500 rounded-full' : 'border-blue-500 transform rotate-45'}`}></span>
                    <span>Air Conduction</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 border-l-2 border-t-2 ${side === 'right' ? 'border-red-500 transform -rotate-45' : 'border-blue-500 transform rotate-135'}`}></span>
                    <span>Bone Conduction</span>
                </div>
            </div>
        </div>
    );
};

export default AudiogramPlotter;
