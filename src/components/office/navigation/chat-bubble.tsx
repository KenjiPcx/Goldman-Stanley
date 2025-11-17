import { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group } from "three";

// Inject CSS animations into document head
if (typeof document !== 'undefined') {
    const styleId = 'chat-bubble-animations';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes chatBubbleAppear {
                from {
                    opacity: 0;
                    transform: translateY(10px) scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
        `;
        document.head.appendChild(style);
    }
}

interface ChatBubbleProps {
    message: string;
    toolName?: string;
    visible: boolean;
    position?: [number, number, number];
}

/**
 * ChatBubble component for displaying tool calls and messages above employees
 * Shows animated chat bubbles with tool call information
 */
export default function ChatBubble({ 
    message, 
    toolName, 
    visible, 
    position = [0, 1.2, 0] 
}: ChatBubbleProps) {
    const groupRef = useRef<Group>(null);
    const [showBubble, setShowBubble] = useState(visible);
    const timeOffset = useMemo(() => Math.random() * Math.PI * 2, []);

    useEffect(() => {
        if (visible) {
            setShowBubble(true);
            // Auto-hide after 5 seconds
            const timer = setTimeout(() => {
                setShowBubble(false);
            }, 5000);
            return () => clearTimeout(timer);
        } else {
            setShowBubble(false);
        }
    }, [visible, message]);

    useFrame((state) => {
        if (groupRef.current && showBubble) {
            const timeElapsed = state.clock.elapsedTime;
            // Gentle floating animation
            const bobHeight = 0.05;
            const bobSpeed = 1.0;
            groupRef.current.position.y = position[1] + Math.sin((timeElapsed * bobSpeed) + timeOffset) * bobHeight;
            
            // Slight rotation for dynamic feel
            groupRef.current.rotation.y = Math.sin(timeElapsed * 0.3) * 0.1;
        }
    });

    if (!showBubble || !message) return null;

    // Extract emoji and text from message
    const emojiMatch = message.match(/^([^\s]+)\s/);
    const emoji = emojiMatch ? emojiMatch[1] : '💬';
    let text = emojiMatch ? message.substring(emojiMatch[0].length) : message;
    
    // Format camelCase text to be more readable (add spaces before capitals)
    text = text.replace(/([a-z])([A-Z])/g, '$1 $2');
    // Also handle sequences of capitals followed by lowercase
    text = text.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');

    return (
        <group ref={groupRef} position={position}>
            <Html
                center
                distanceFactor={10}
                zIndexRange={[100, 0]}
                style={{
                    pointerEvents: 'none',
                    userSelect: 'none',
                }}
            >
                <div
                    style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        padding: '10px 14px',
                        borderRadius: '18px',
                        maxWidth: '300px',
                        minWidth: '150px',
                        fontSize: '12px',
                        color: 'white',
                        fontWeight: '500',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '8px',
                        position: 'relative',
                        animation: 'chatBubbleAppear 0.3s ease-out',
                        border: '2px solid rgba(255,255,255,0.2)',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                    }}
                >
                    {/* Tail pointing down */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '-8px',
                            left: '20px',
                            width: 0,
                            height: 0,
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderTop: '8px solid #667eea',
                            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))',
                        }}
                    />
                    
                    {/* Emoji icon */}
                    <div
                        style={{
                            fontSize: '18px',
                            flexShrink: 0,
                            lineHeight: 1,
                        }}
                    >
                        {emoji}
                    </div>
                    
                    {/* Message text */}
                    <div
                        style={{
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            lineHeight: '1.4',
                            flex: 1,
                            minWidth: 0, // Allow flex item to shrink below content size
                        }}
                    >
                        {text}
                    </div>
                </div>
            </Html>
        </group>
    );
}

