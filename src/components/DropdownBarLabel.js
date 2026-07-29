import {
    getBarFillRatio,
    getBarLabelColor,
} from './utils.js';

const ROW_HORIZONTAL_PADDING = 8;

/**
 * Keeps dropdown text readable when it crosses the end of a provenance bar.
 * The black base label covers the panel background; a clipped white copy
 * covers only the portion backed by a dark bar.
 */
const DropdownBarLabel = ({
    value,
    children,
    guidance,
    orientationScheme,
    containerWidth,
    showTimeline,
}) => {
    const barLabelColor = showTimeline
        ? 'black'
        : getBarLabelColor(value, guidance, orientationScheme);
    const barWidth = getBarFillRatio(value, guidance) * containerWidth;
    const whiteOverlayWidth = Math.max(
        0,
        barWidth - ROW_HORIZONTAL_PADDING
    );

    return (
        <span
            style={{
                position: 'relative',
                zIndex: 1,
                pointerEvents: 'none',
                color: 'black',
                whiteSpace: 'nowrap',
            }}
        >
            {children}
            {!showTimeline
                && barLabelColor === 'white'
                && whiteOverlayWidth > 0 && (
                    <span
                        aria-hidden="true"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: `${whiteOverlayWidth}px`,
                            overflow: 'hidden',
                            color: 'white',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                        }}
                    >
                        {children}
                    </span>
                )}
        </span>
    );
};

export default DropdownBarLabel;
