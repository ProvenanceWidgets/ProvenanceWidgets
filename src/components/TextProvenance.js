import SuperProvenance from "./SuperProvenance.js";

export default class TextProvenance extends SuperProvenance {
    constructor() {
        super();
    }

    get(value) {
        return this.provenance.get(value);
    }

    add(value) {
        if (!this.provenance.has(value)) {
            this.provenance.set(value, {
                interactions: 0,
                timestamps: []
            });
        }

        const existing = this.provenance.get(value);

        existing.interactions += 1;
        existing.timestamps.push(new Date());

        this.provenance.set(value, existing);
        this.update(this.provenance);
    }
}
