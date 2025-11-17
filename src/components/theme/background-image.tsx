import { useState, useEffect } from "react";

interface BackgroundImageProps {
    src: string;
    alt: string;
    priority?: boolean;
    className?: string;
}

export function BackgroundImage({ src, alt, priority = false, className = "" }: BackgroundImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Force show after a short delay if onLoad doesn't fire
        const timer = setTimeout(() => setIsLoaded(true), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`absolute inset-0 ${className}`}>
            <img
                src={src}
                alt={alt}
                loading={priority ? "eager" : "lazy"}
                className={`absolute inset-0 w-full h-full object-cover object-bottom transition-opacity duration-500 ease-in-out ${isLoaded ? "opacity-100" : "opacity-0"
                    }`}
                onLoad={() => setIsLoaded(true)}
                onError={(e) => {
                    console.error("Failed to load image:", src);
                    setIsLoaded(true); // Show even if error to debug
                }}
            />
        </div>
    );
}

