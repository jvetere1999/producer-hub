<!--
  TemplateSelector Component

  Allows selecting from preset drum pattern templates.
  Shows template info and explanation for learning.

  @component
-->
<script lang="ts">
    import { PATTERN_TEMPLATES, type PatternTemplate } from '$lib/patterns';

    export let selectedTemplateId: string | null = null;
    export let onselect: ((template: PatternTemplate) => void) | undefined = undefined;

    let showInfo = false;
    let selectedTemplate: PatternTemplate | null = null;

    $: selectedTemplate = PATTERN_TEMPLATES.find(t => t.id === selectedTemplateId) || null;

    function handleSelect(template: PatternTemplate) {
        onselect?.(template);
    }

    function toggleInfo() {
        showInfo = !showInfo;
    }
</script>

<div class="template-selector">
    <div class="template-header">
        <h4>Templates</h4>
        {#if selectedTemplate}
            <button class="info-btn" onclick={toggleInfo} aria-label="Show template info">
                ℹ️
            </button>
        {/if}
    </div>

    <div class="template-grid">
        {#each PATTERN_TEMPLATES as template}
            <button
                class="template-card"
                class:selected={selectedTemplateId === template.id}
                onclick={() => handleSelect(template)}
                aria-pressed={selectedTemplateId === template.id}
                aria-label="Select {template.name} template at {template.bpm} BPM"
                title="{template.name} - {template.bpm} BPM"
            >
                <span class="template-name">{template.name}</span>
                <span class="template-bpm">{template.bpm} BPM</span>
            </button>
        {/each}
    </div>

    {#if showInfo && selectedTemplate}
        <div class="template-info">
            <div class="info-header">
                <h5>{selectedTemplate.name}</h5>
                <button class="close-btn" onclick={toggleInfo} aria-label="Close">×</button>
            </div>
            <div class="info-details">
                <span class="detail"><strong>Genre:</strong> {selectedTemplate.genre}</span>
                <span class="detail"><strong>BPM:</strong> {selectedTemplate.bpm}</span>
                <span class="detail"><strong>Steps:</strong> {selectedTemplate.stepsPerBar}</span>
                {#if selectedTemplate.swing > 0}
                    <span class="detail"><strong>Swing:</strong> {Math.round(selectedTemplate.swing * 100)}%</span>
                {/if}
            </div>
            <p class="explanation">{selectedTemplate.explanation}</p>
        </div>
    {/if}
</div>

<style>
    .template-selector {
        background: var(--bg-secondary, #2d2d2d);
        border-radius: 8px;
        padding: 12px;
    }

    .template-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }

    .template-header h4 {
        margin: 0;
        font-size: 14px;
        color: var(--text-primary, #fff);
    }

    .info-btn {
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        padding: 4px;
        opacity: 0.7;
    }

    .info-btn:hover {
        opacity: 1;
    }

    .template-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 8px;
    }

    .template-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 12px 8px;
        border: 1px solid var(--border-default, #444);
        border-radius: 8px;
        background: var(--bg-tertiary, #333);
        cursor: pointer;
        transition: all 0.15s;
        min-height: 60px;
    }

    .template-card:hover {
        border-color: var(--text-muted, #888);
        transform: translateY(-1px);
    }

    .template-card.selected {
        border-color: var(--accent-primary, #ff764d);
        background: var(--accent-primary, #ff764d)22;
    }

    .template-name {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary, #fff);
    }

    .template-bpm {
        font-size: 11px;
        color: var(--text-muted, #888);
    }

    .template-info {
        margin-top: 12px;
        padding: 12px;
        background: var(--bg-tertiary, #333);
        border-radius: 8px;
        border: 1px solid var(--border-default, #444);
    }

    .info-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }

    .info-header h5 {
        margin: 0;
        font-size: 14px;
        color: var(--text-primary, #fff);
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 20px;
        color: var(--text-muted, #888);
        cursor: pointer;
        padding: 0;
        line-height: 1;
    }

    .close-btn:hover {
        color: var(--text-primary, #fff);
    }

    .info-details {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 8px;
    }

    .detail {
        font-size: 12px;
        color: var(--text-secondary, #aaa);
    }

    .detail strong {
        color: var(--text-muted, #888);
    }

    .explanation {
        margin: 0;
        font-size: 13px;
        line-height: 1.5;
        color: var(--text-secondary, #aaa);
    }
</style>

