const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Normalize a pointer-created rectangle to the plot bounds. Coordinates are
 * always expressed relative to the temporal plot, not the page.
 */
export const normalizeRectangle = ({
    startX,
    startY,
    endX,
    endY,
    width,
    height,
}) => {
    const boundedWidth = Math.max(0, Number(width) || 0);
    const boundedHeight = Math.max(0, Number(height) || 0);
    const x1 = clamp(Number(startX) || 0, 0, boundedWidth);
    const x2 = clamp(Number(endX) || 0, 0, boundedWidth);
    const y1 = clamp(Number(startY) || 0, 0, boundedHeight);
    const y2 = clamp(Number(endY) || 0, 0, boundedHeight);

    return {
        left: Math.min(x1, x2),
        top: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
    };
};

export const rectangleContainsPoint = (rectangle, point) => {
    if (!rectangle || !point) return false;
    return (
        point.x >= rectangle.left &&
        point.x <= rectangle.left + rectangle.width &&
        point.y >= rectangle.top &&
        point.y <= rectangle.top + rectangle.height
    );
};

export const rectangleContainsAnyPoint = (rectangle, points) => (
    Array.isArray(points) && points.some(point =>
        rectangleContainsPoint(rectangle, point)
    )
);
