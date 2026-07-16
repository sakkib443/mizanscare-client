export default function Logo({ className = "", size = "default" }) {
    const heightClass =
        size === "small" ? "h-8"
            : size === "large" ? "h-14"
                : size === "xl" ? "h-16"
                    : "h-10";

    return (
        <div className={`flex items-center ${className}`}>
            <img
                src="/images/logo.png"
                alt="Mizan's Care - An English Language Training Centre"
                className={`${heightClass} object-contain`}
            />
        </div>
    );
}
