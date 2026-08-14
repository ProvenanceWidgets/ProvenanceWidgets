import { useLayoutEffect, useState } from "react";

export default function useElementSize() {
    const [ref, setRef] = useState(null);
    const [size, setSize] = useState({
        width: 0,
        height: 0,
    });

    const handleSize = () => {
        setSize({
            width: ref?.offsetWidth || 0,
            height: ref?.offsetHeight || 0,
        });
    };

    useLayoutEffect(() => {
        if (!ref) return;

        handleSize(); // Initial size

        const observer = new ResizeObserver(() => {
            handleSize();
        });

        observer.observe(ref);

        return () => observer.disconnect();
    }, [ref]);

    return [setRef, size];
}
