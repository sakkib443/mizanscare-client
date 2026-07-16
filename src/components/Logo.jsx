export default function Logo({ className = "", size = "default" }) {
    // The artwork is a wide (~6.4:1) partnership lockup — Mizan's Care alongside the
    // IDP and IELTS marks — so height is what drives the size here. max-w-full lets it
    // shrink rather than overflow inside narrow containers such as the sidebars.
    const heightClass =
        size === "small" ? "h-8"
            : size === "large" ? "h-11"
                : size === "xl" ? "h-12"
                    : "h-9";

    return (
        <div className={`flex items-center ${className}`}>
            <img
                src="/images/logo.png"
                alt="Mizan's Care - An English Language Training Centre"
                className={`${heightClass} w-auto max-w-full object-contain`}
            />
        </div>
    );
}
