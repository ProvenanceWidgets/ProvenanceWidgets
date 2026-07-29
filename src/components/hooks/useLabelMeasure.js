import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const useLabelMeasure = (labels, fontSize = '12px') => {
    const [maxWidth, setMaxWidth] = React.useState(0);

    useEffect(() => {
        if (!labels || labels.length === 0) return;

        const tempSvg = d3.select('body').append('svg').style('visibility', 'hidden');

        const tempText = tempSvg.selectAll('.temp-text')
            .data(labels)
            .enter()
            .append('text')
            .text(d => d)
            .style('font-size', fontSize)
            .style('font-family', 'sans-serif');

        const width = d3.max(tempText.nodes(), node => node.getBBox().width);
        tempSvg.remove();

        setMaxWidth(width);
    }, [labels, fontSize]);

    return maxWidth;
}

export default useLabelMeasure