// const PROJECT_NAME = "project_1";
const PROJECT_NAME = "css_bsides_tll_2025";
const SLIDE_WIDTH = 768;
const SLIDE_HEIGHT = 432;
let isPresenting = false;
let isEditing = true;
const isExport = false;
const exportData = '';

const isFirefox = /firefox/i.test(navigator.userAgent);

const loadingText = document.querySelector("#slides-loading");
const liteModeCheck = document.querySelector("#lite-mode");
const slidesOverlay = document.querySelector("slides-overlay");
const slidesAside = document.querySelector("slides-aside");
const slidesPreview = document.querySelector("slides-preview");
const slidesPreviewDiv = document.querySelector("slides-preview > div > div");
const slidesPreviewDivGlobal = document.querySelector("slides-preview > div > div > .global");
const slidesPreviewDivInner = document.querySelector("slides-preview > div > div > .body");
slidesPreview.addEventListener("wheel", (e) => {
    if (e.ctrlKey) e.preventDefault();
    if (e.buttons == 1 && draggedElIdx != -1) {
        scrollSelected(e.deltaY, e.altKey, e.shiftKey);
    }
    if (e.buttons != 0) return;
    if (isEditing || e.ctrlKey) {
        const deltaY = e.deltaY;
        const zoomSpeed = 2;
        const oldScale = parseFloat(getComputedStyle(slidesPreviewDiv).scale);
        const newScale = oldScale - (oldScale/1000)*deltaY*zoomSpeed;
        slidesPreviewDiv.style.scale = newScale;
    }
});

function dragSlidesPreview(x,y) {
    const scale = parseFloat(getComputedStyle(slidesPreviewDiv).scale);
    slidesPreviewX -= (lastMouseX - x)/scale;
    slidesPreviewY -= (lastMouseY - y)/scale;
    slidesPreviewDiv.style.transform = `translate(${slidesPreviewX}px, ${slidesPreviewY}px)`;
}

let mouseHidden = false;
let lastMouseMove = 0;
let lastMiddleMouseDown = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let dragMouseX = 0;
let dragMouseY = 0;
let slidesPreviewX = 0;
let slidesPreviewY = 0;
slidesPreview.addEventListener("mousedown", (e) => {
    if (isPresenting && (e.which == 1 || e.which == 3)) {
        if (e.which == 1)
            e.clientX <  window.innerWidth/5*2 ? prevSlideSoft() : nextSlideSoft();
        if (e.which == 3)
            e.clientX >= window.innerWidth/5*2 ? prevSlideSoft() : nextSlideSoft();
        e.preventDefault();
    }
    if (e.which == 1) {
        startDraggingSelected(e.target);
        e.preventDefault();
    }
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    dragMouseX = e.clientX;
    dragMouseY = e.clientY;
    if (e.which == 2) lastMiddleMouseDown = Date.now();
});
slidesPreview.addEventListener("mousemove", (e) => {
    highlightHoverEl(e?.target);
    let which = e.which;
    if (isFirefox) {
        which = 0;
        if (e.buttons == 1) which = 1;
        if (e.buttons == 4) which = 2;
    }
    if (which == 2) dragSlidesPreview(e.clientX, e.clientY);
    if (which == 1) dragSelected(e.clientX, e.clientY);
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    lastMiddleMouseDown = 0;
    lastMouseMove = Date.now();
    if (mouseHidden) {
        document.body.style.cursor = "";
        if (isPresenting)slidesOverlay.style.display="flex";
        mouseHidden = false;
    }
});
slidesPreview.addEventListener("mouseup", (e) => {
    if (e.which == 1) {
        dragSelected(e.clientX, e.clientY);
        applyDrag();
        draggedElIdx = -1;
    }
    if (e.which == 2) {
        dragSlidesPreview(e.clientX, e.clientY);
        if (lastMiddleMouseDown + 200 > Date.now()) {
            resetZoom();
        }
    }
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

function resetZoom() {
    slidesPreviewX = 0;
    slidesPreviewY = 0;
    slidesPreviewDiv.style.scale = "";
    slidesPreviewDiv.style.transform = "";
}

function findElByIdx(elIdx) {
    const state = previewSlideIdx == currentSlideIdx ? editor.state : (allSlides[previewSlideIdx].state || editor.state);
    const codeReplacements = {};
    let stateText = state.doc.toString().replace(/```([^\s]+)(.*?)```/gs, (match) => {
        const replacementString = "CODE-REPLACEMENT-" + Math.random().toString(36);
        codeReplacements[replacementString] = match;
        return replacementString;
    });
    stateText = stateText.replace(/(<[a-z][^<>]*?)>/g, "$1DATACODEINDEX>").split("DATACODEINDEX").map((e,i) => (i==elIdx?e+"DATACODESPLIT":e)).join("");
    Object.entries(codeReplacements).forEach(([k,v]) => stateText = stateText.replace(k,v));
    const el = slidesPreviewDivInner.querySelector(`[data-code-index="${elIdx}"]`);
    return {state, stateText, el};
}

function highlightHoverEl(el) {
    document.querySelectorAll("[data-code-hover-highlight]").forEach(e=>delete e.dataset.codeHoverHighlight);
    if (!isEditing) return;
    if (el && "codeIndex" in el.dataset) el.dataset.codeHoverHighlight = 1;
}

let draggedElIdx = -1;
function startDraggingSelected(target) {
    if (!("codeIndex" in target.dataset)) {
        draggedElIdx = -1;
        return;
    }
    if (!isEditing) return;
    draggedElIdx = parseInt(target.dataset.codeIndex);
    const {state, stateText, el} = findElByIdx(draggedElIdx);
    const oldMargin = el.style.margin;
    const oldScale = el.style.scale;
    const oldRotate = el.style.rotate;
    el.style.margin = "0px";
    el.style.scale = "100%";
    el.style.rotate = "0deg";
    const sldRect = slidesPreviewDivInner.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const absX = (elRect.x - sldRect.x)/sldRect.width*SLIDE_WIDTH;
    const absY = (elRect.y - sldRect.y)/sldRect.height*SLIDE_HEIGHT;
    el.dataset.absX = absX;
    el.dataset.absY = absY;
    el.style.margin = oldMargin;
    el.style.scale = oldScale;
    el.style.rotate = oldRotate;
    if (isFirefox)
        firefoxUnitsFix(slidesPreviewDivInner);
}

function scrollSelected(deltaY, altKey, shiftKey) {
    if (draggedElIdx == -1) return;
    const {state, stateText, el} = findElByIdx(draggedElIdx);
    if (altKey) { // rotation
        const rotSpeed = shiftKey?0.1:1;
        el.dataset.absR = parseFloat(el.dataset?.absR ?? 0) + deltaY*rotSpeed/100;
    } else { // scale
        if (!("absS" in el.dataset))
            el.dataset.absS = 100;
        const zoomSpeed = shiftKey?0.1:1;
        const oldScale = parseFloat(el.dataset.absS);
        const newScale = oldScale - (oldScale/1000)*deltaY*zoomSpeed;
        el.dataset.absS = newScale;
    }
    if (isFirefox)
        firefoxUnitsFix(slidesPreviewDivInner);
}

function applyDrag() {
    if (draggedElIdx == -1) return;
    const {state, stateText, el} = findElByIdx(draggedElIdx);
    const htmlText = stateText.split("DATACODESPLIT")[0].replace(/^[\s\S]*(<[a-z][^<>]*?)$/m, "$1");
    const to = stateText.split("DATACODESPLIT")[0].length;
    const from = to - htmlText.length;
    const newHtmlText = htmlText.replace(/data-abs-.=["'0-9\.-]+/g, "").replace(/ +$/,'') + ` data-abs-x=${+parseFloat(el.dataset.absX).toFixed(3)} data-abs-y=${+parseFloat(el.dataset.absY).toFixed(3)}${"absS" in el.dataset?` data-abs-s=${+parseFloat(el.dataset.absS).toFixed(3)}`:``}${"absR" in el.dataset?` data-abs-r=${+parseFloat(el.dataset.absR).toFixed(3)}`:``}`;
    if (previewSlideIdx != currentSlideIdx)
        selectSlide(previewSlideIdx);
    editor.dispatch({
        changes: {from, to, insert: newHtmlText}
    });
}

function dragSelected(x,y) {
    if (draggedElIdx == -1) return;
    const scale = parseFloat(getComputedStyle(slidesPreviewDiv).scale);
    const {state, stateText, el} = findElByIdx(draggedElIdx);
    const oldLeft = parseFloat(el.dataset.absX);
    const oldTop = parseFloat(el.dataset.absY);
    const newLeft = oldLeft - (lastMouseX - x)/scale;
    const newTop = oldTop - (lastMouseY - y)/scale;
    el.dataset.absX = newLeft;
    el.dataset.absY = newTop;
    if (isFirefox)
        firefoxUnitsFix(slidesPreviewDivInner);
}

function playAnimation() {
    slidesPreviewDivInner.classList.add("starting-style");
    // requestAnimationFrame(()=>slidesPreviewDivInner.classList.remove("starting-style"));
    requestAnimationFrame(()=>
        requestAnimationFrame(()=>
            slidesPreviewDivInner.classList.remove("starting-style")
        )
    );
}

function updateAnimations() {
    if (currentAnimation == 0) return;
    const maxAnimation = currentAnimation;
    currentAnimation = 0;
    for (let i = 0; i<maxAnimation; i++) {
        playNextAnimation();
    }
}

function playNextAnimtionLoop() {
    //if (!playNextAnimation()) while (currentAnimation) playPrevAnimation();
    if (!playNextAnimation()) {
        currentAnimation = 0;
        updatePreview();
    }
}

function remapInlineFiles(text) {
    return text.split("FILE(").map((e,i) => (i?cachedFileData[e.split(")")[0]] + e.replace(/^.*?\)/,''):e)).join("");
}

function firefoxUnitsFix(div) {
    // unit-ed data attr fallback for firefox
    [["x","px"],["y","px"],["s","%"],["r","deg"]].forEach(([v,unit]) => {
        const unitVarRegex = new RegExp(`--data-abs-${v}:\\s*["'0-9\\.-]+${unit};`, "g");
        div.querySelectorAll(`[data-abs-${v}]`).forEach(e => {
            const oldStyle = (e.getAttribute("style")??"").replace(unitVarRegex,"");
            e.setAttribute("style",`--data-abs-${v}:${e.dataset[`abs${v.toUpperCase()}`]}${unit};` + oldStyle);
        });
    });
}

// may be unnecessary
function preloadCode() {
    allSlides.forEach((slide) => {
        slide.code.replace(/```([^\s]+)(.*?)```/gs, (match, lang, code) => {
            const language = lang.split(";")[0];
            const classes = lang.split(";").slice(1).join(" ");
            let highlighted = cachedCodeblocks[code.trim() + language];
            if (!highlighted) {
                try {
                    highlighted = hljs.highlight(code.trim(), {language}).value;
                } catch {
                    highlighted = hljs.highlight(code.trim(), {language:"css"}).value;
                }
                cachedCodeblocks[code.trim() + language] = highlighted;
            }
        });
    })
}

function updatePreview() {
    previewNeedsUpdate = false;
    const state = previewSlideIdx == currentSlideIdx ? editor.state : (allSlides[previewSlideIdx].state || editor.state);
    let stateText = "";
    let textPos = 0;
    state.selection.ranges.forEach(({from, to})=>{
        stateText += state.doc.toString().slice(textPos, from);
        stateText += state.doc.toString().slice(from, to).replace(/(<[a-z][^<>]*?)>/g, "$1 data-code-selected>");
        textPos = to;
    });
    stateText += state.doc.toString().slice(textPos);
    const codeReplacements = {};
    stateText = stateText.replace(/```([^\s]+)(.*?)```/gs, (match, lang, code) => {
        const language = lang.split(";")[0];
        const classes = lang.split(";").slice(1).join(" ");
        let highlighted;// = cachedCodeblocks[code.trim() + language];
        if (!highlighted) {
            try {
                highlighted = hljs.highlight(code.trim(), {language}).value;
            } catch {
                highlighted = hljs.highlight(code.trim(), {language:"css"}).value;
            }
            //cachedCodeblocks[code.trim() + language] = highlighted;
        }
        
        const replacementString = "CODE-REPLACEMENT-" + Math.random().toString(36);
        codeReplacements[replacementString] = `<pre class="highlighted-pre ${classes}"><code class="hljs">${highlighted}</code></pre>`;
        return replacementString;
    });
    stateText = stateText.replace(/(<[a-z][^<>]*?)>/g, "$1 data-code-index=DATACODEINDEX>").split("DATACODEINDEX").map((e,i) => (e.endsWith("=")?e+i:e)).join("");
    stateText = remapInlineFiles(stateText);
    Object.entries(codeReplacements).forEach(([k,v]) => stateText = stateText.replace(k,v));
    [...slidesPreviewDivInner.classList].slice(1).forEach(e=>slidesPreviewDivInner.classList.remove(e));
    slidesPreviewDivInner.classList.add(allSlides[previewSlideIdx].id);
    if (currentSlideIdx == 0 || lastGlobalState !== allSlides[0].state) {
        slidesPreviewDivGlobal.innerHTML = remapInlineFiles(allSlides[0].code);
        const liteNotes = allSlides[0].code.split("<!--NOTE:")[1]?.split("-->")?.[0];
        if (liteNotes)
            document.querySelector("note-area").innerHTML = liteNotes;
        lastGlobalState = allSlides[0].state;
    }
    slidesPreviewDivInner.innerHTML = stateText;
    if (isFirefox) {
        firefoxUnitsFix(slidesPreviewDivInner);
    }
    updateAnimations();
    // remove comments from html
    slidesPreviewDiv.querySelectorAll("*").forEach(e=>e.childNodes.forEach(x=>x.nodeType==Node.COMMENT_NODE&&x.remove()));
    if (isEditing && !isPresenting)
        updatePreviewImage(true);
}

let editor;
let cachedFileData = {};
let cachedSlidePreviews = {};
let renderedSlides = {};
let cachedCodeblocks = {};

let lastGlobalState = -1;
let lastEditorState = null;
let lastEditorChange = 0;
let previewNeedsUpdate = false;
const PREVIEW_DEBOUNCE_MS = 10;
function animate() {
    if (editor.state != lastEditorState) {
        lastEditorChange = Date.now();
        allSlides[currentSlideIdx].code = editor.state.doc.toString();
        previewNeedsUpdate = true;
        lastEditorState = editor.state;
        updateProjectModified(true);
    }
    if (previewNeedsUpdate && lastEditorChange < Date.now() - PREVIEW_DEBOUNCE_MS && !isPresenting) {
        updatePreview();
    }
    //editor.state.doc.toString();
    if (lastMouseMove + 1000 < Date.now() && isPresenting && !mouseHidden) {
        document.body.style.cursor = "none";
        slidesOverlay.style.display="none";

        mouseHidden = true;
    }
    requestAnimationFrame(animate);
}

let currentSlideIdx = 1;
let previewSlideIdx = 1;
const SLIDE_TEMPLATE = {name:"",id:"TEMPLATE",code:"<h1>Title</h1>\n<p>text</p>\n<style>.body.TEMPLATE {\n  \n}</style>",state:null}
let allSlides = [
    {name:"global",id:"global",code:"<style>.body {\n  \n}</style>",state:null},
];

let lastPreviewUpdate = 0;
let lastPreviewRequest = 0;
async function updatePreviewImage(throttle) {
    if (throttle && lastPreviewUpdate + 500 > Date.now()) {
        if (lastPreviewRequest)
            clearInterval(lastPreviewRequest);
        lastPreviewRequest = setTimeout(()=>{lastPreviewRequest=0;updatePreviewImage(true)}, 500);
        return;
    };
    try {
        lastPreviewUpdate = Date.now();
        if (lastPreviewRequest)
            clearInterval(lastPreviewRequest);
        cachedSlidePreviews[previewSlideIdx] = await domtoimage.toPng(slidesPreviewDivInner, {rWidth: 128, rHeight: 72});
        document.querySelector(`slide-list-item[data-slide-index="${previewSlideIdx}"]`).style.backgroundImage = `url(${cachedSlidePreviews[previewSlideIdx]})`;
        lastPreviewUpdate = Date.now();
    } catch {}
}

/* warn: this will corrupt the project */
async function loadAllPreviews() {
    const oldSlideIdx = currentSlideIdx;
    for (let i = 0; i < allSlides.length; i++) {
        selectSlide(i);
        await updatePreviewImage();
    }
    currentSlideIdx = oldSlideIdx;
    selectSlide(currentSlideIdx);
}

function selectSlide(i) {
    if (currentSlideIdx == i && previewSlideIdx == i) {
        playNextAnimtionLoop();
        return;
    } else {
        currentAnimation = 0;
    }
    allSlides[currentSlideIdx].state = editor.state;
    const newState = allSlides[i].state ?? bundledEditor.getState(allSlides[i].code);
    editor.setState(newState);
    lastEditorState = editor.state;
    if (i != 0 || currentSlideIdx == 0)
        previewSlideIdx = i;
    currentSlideIdx = i;
    updateSlidesList();
    updatePreview();
    playAnimation();
    lastPreviewUpdate = 0;
    updateNextSlidePreview();
    //updatePreviewImage();
}

let currentAnimation = 0;

function playPrevAnimation() {
    if (currentAnimation == 0) return false;
    const currentAnimationClass = `anim-${currentAnimation}`;
    document.querySelectorAll(`.body.${allSlides[previewSlideIdx].id}, .body.${allSlides[previewSlideIdx].id} *`).forEach(e => {
        e.classList.remove(currentAnimationClass);
    });
    currentAnimation--;
    return true;
}

function playNextAnimation() {
    currentAnimation++;
    const currentAnimationClass = `anim-${currentAnimation}`;
    if (!allSlides[previewSlideIdx].code.includes(currentAnimationClass)) return false;
    document.querySelectorAll(`.body.${allSlides[previewSlideIdx].id}, .body.${allSlides[previewSlideIdx].id} *`).forEach(e => {
        e.classList.add(currentAnimationClass);
    });
    document.querySelectorAll(`.replayOnAnimation`).forEach(e => {
        try {
            e.pause();
            e.currentTime = 0;
            e.play();
        } catch { console.error("Error replaying video", e); }
    });
    return true;
}

function prevSlide() {
    currentAnimation = 0;
    selectSlide(Math.max(1, currentSlideIdx - 1));
}

function nextSlide() {
    currentAnimation = 0;
    selectSlide(Math.min(allSlides.length-1, currentSlideIdx + 1));
}

function prevSlideSoft() {
    if (!playPrevAnimation()) {
        prevSlide();
        //while (allSlides[previewSlideIdx].code.includes(`anim-${currentAnimation+1}`)) currentAnimation++;
    }
    updateNextSlidePreview();
}

function nextSlideSoft() {
    if (!playNextAnimation())
        nextSlide();
    updateNextSlidePreview();
}

function addSlide(doSelect) {
    const newSlide = JSON.parse(JSON.stringify(SLIDE_TEMPLATE).replace(/TEMPLATE/g,"s"+Math.random().toString(36).split(".")[1]));
    allSlides.push(newSlide);
    if (doSelect)
        selectSlide(allSlides.length - 1);
}

function removeSlide(i) {
    if (!confirm("Delete the slide?")) return;
    if (currentSlideIdx == i) {
        selectSlide(i-1);
        previewSlideIdx = currentSlideIdx;
    }
    allSlides.splice(i, 1);
    const tempPreviews = Object.values(cachedSlidePreviews);
    tempPreviews.splice(i, 1);
    cachedSlidePreviews = Object.fromEntries(Object.entries(tempPreviews));
    updateSlidesList();
}

function swapSlide(from, to) {
    if (to <= 0 || to >= allSlides.length) return;
    if (from <= 0 || from >= allSlides.length) return;
    if (from == to) return;
    if (currentSlideIdx == to || currentSlideIdx == from)
        allSlides[currentSlideIdx].state = editor.state;
    const fromSlide = allSlides[from];
    const toSlide = allSlides[to];
    allSlides[from] = toSlide;
    allSlides[to] = fromSlide;
    const fromPreview = cachedSlidePreviews[from];
    cachedSlidePreviews[from] = cachedSlidePreviews[to];
    cachedSlidePreviews[to] = fromPreview;
    if (previewSlideIdx == from || currentSlideIdx == from) {
        currentSlideIdx = to;
        previewSlideIdx = to;
    } else if (previewSlideIdx == to || currentSlideIdx == to) {
        currentSlideIdx = from;
        previewSlideIdx = from;
    }
    updateSlidesList();
}

function moveSlide(from, to) {
    if (to <= 0 || to >= allSlides.length) return;
    if (from <= 0 || from >= allSlides.length) return;
    if (from == to) return;
    const movingSlide = allSlides.splice(from,1);
    allSlides.splice(to, 0, ...movingSlide);
    let previewEntries = Object.entries(cachedSlidePreviews);
    const movingPreview = cachedSlidePreviews?.[from];
    previewEntries = previewEntries.filter(([k,v])=>k!=from);
    if (currentSlideIdx == from) currentSlideIdx = to;
    //else if (currentSlideIdx == to) currentSlideIdx = from;
    else if (from > to) { if (currentSlideIdx >= to && currentSlideIdx < from) currentSlideIdx++; }
    else { if (currentSlideIdx > from && currentSlideIdx <= to) currentSlideIdx--; }
    if (previewSlideIdx == from) previewSlideIdx = to;
    //else if (previewSlideIdx == to) previewSlideIdx = from;
    else if (from > to) { if (previewSlideIdx >= to && previewSlideIdx < from) previewSlideIdx++; }
    else { if (previewSlideIdx > from && previewSlideIdx <= to) previewSlideIdx--; }
    if (from > to) previewEntries = previewEntries.map(([k,v]) => [k>=to&&k<from?+k+1:k,v]);
    else previewEntries = previewEntries.map(([k,v]) => [k>from&&k<=to?+k-1:k,v]);    
    cachedSlidePreviews = Object.fromEntries(previewEntries);
    if (movingPreview) cachedSlidePreviews[to] = movingPreview;
    updateSlidesList();
}

function updateSlidesList() {
    slidesAside.innerText = "";
    allSlides.forEach((e,i) => {
        const slideListItem = document.createElement("slide-list-item");
        slideListItem.draggable = true;
        slideListItem.addEventListener("dragstart", (event) =>
            event.dataTransfer.setData("text/plain", `slide-item/${i}`),
        );
        slideListItem.addEventListener("dragenter", (ev) => {
            slideListItem.classList.add("dragTarget");
            ev.preventDefault();
        });
        slideListItem.addEventListener("dragleave", (ev) => {
            slideListItem.classList.remove("dragTarget");
            ev.preventDefault();
        });
        slideListItem.addEventListener("dragend", (ev) => {
            slideListItem.classList.remove("dragTarget");
            ev.preventDefault();
        });
        slideListItem.addEventListener("drop", (ev) => {
            slideListItem.classList.remove("dragTarget");
            ev.preventDefault();
            const data = ev.dataTransfer.getData("text");
            if (!data.startsWith("slide-item/")) return;
            const sourceIdx = parseInt(data.split("/")[1]);
            moveSlide(sourceIdx, i>sourceIdx?i-1:i);
        });
        slideListItem.dataset.slideIndex = i;
        if (cachedSlidePreviews[i])
            slideListItem.style.backgroundImage = `url(${cachedSlidePreviews[i]})`;
        //slideListItem.innerText = `#${i} - ${e.name}`;
        const titleText = /<h1>(.+?)<\/h1>/.exec(e.code)?.[1];
        const titleTextDisplay = titleText ? " " + titleText.replace(/(<br>|\n)/g," ").replace(/<.*?>/g,"").slice(0,12) : "";
        slideListItem.innerText = i?`#${i}${titleTextDisplay}`:'(global)';
        if (currentSlideIdx == i) slideListItem.classList.add("selected");
        slideListItem.onclick = () => selectSlide(i);
        if (i) {
            const slideListUp = document.createElement("slide-list-action");
            const slideListDown = document.createElement("slide-list-action");
            const slideListRemove = document.createElement("slide-list-action");
            slideListUp.innerText = "^";
            slideListDown.innerText = "v";
            slideListRemove.innerText = "x";
            slideListUp.onclick = (e) => {e.stopPropagation();swapSlide(i,i-1)};
            slideListDown.onclick = (e) => {e.stopPropagation();swapSlide(i,i+1)};
            slideListRemove.onclick = (e) => {e.stopPropagation();removeSlide(i)};
            //slideListItem.appendChild(slideListUp);
            //slideListItem.appendChild(slideListDown);
            slideListItem.appendChild(slideListRemove);
        }
        slidesAside.appendChild(slideListItem);
    });
    const slideListAdd = document.createElement("slide-list-add");
    slideListAdd.innerText = "add slide";
    slideListAdd.onclick = () => addSlide(true);
    slidesAside.appendChild(slideListAdd);
}

async function saveProject() {
    await dumpSlideData();
    updateProjectModified(false);
}

// https://stackoverflow.com/a/73891404
async function replaceAsync(string, regexp, replacerFunction) {
    const replacements = await Promise.all(
        Array.from(string.matchAll(regexp),
            match => replacerFunction(...match)));
    let i = 0;
    return string.replace(regexp, () => replacements[i++]);
}

function updateNextSlidePreview() {
    try {
        const currentSlidePreview = renderedSlides[`${currentSlideIdx},${currentAnimation}`];
        const nextSlidePreview = renderedSlides[`${currentSlideIdx},${currentAnimation+1}`] ?? renderedSlides[`${currentSlideIdx+1},0`];
        if (currentSlidePreview)
            presenterWindow.document.getElementById("currentSlide").src = currentSlidePreview
        if (nextSlidePreview)
            presenterWindow.document.getElementById("nextSlide").src = nextSlidePreview
    } catch {}
}

let presenterWindow;
let presenterTimer;
function openPresenterView() {
    presenterTimer = Date.now();
    presenterWindow = window.open("", "presenterWindow", "popup");
    presenterWindow.document.body.innerHTML = `
        <div style="display:flex;flex-direction: column;align-items: stretch;padding: 16px;box-sizing: border-box;">
            <div style="max-height: calc((100vw - 3 * 16px) / 3.1);flex:1;display:flex;gap:16px;align-items: stretch;">
                <div style="flex:4"><img id=currentSlide></div>
                <div style="flex:5"><img id=nextSlide></div>
            </div>
            <h1 style="font-size: 10vw;margin-top: 0;text-align: center;opacity:0.5;font-weight: 400;font-family:monospace,monospace" id="timer"></h1>
        </div>
        <style>
        html,body,body>div {
            background:#000;
            color:#FFF;
            margin:0;
            width:100%;
            height:100%;
        }
        body>div>div>div>img{
            &>img {
                width:100%;
            }
        }
        </style>
    `;
    presenterWindow.document.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            if (isPresenting) {
                e.preventDefault();
                prevSlideSoft();
            }
        }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === " ") {
            if (isPresenting) {
                e.preventDefault();
                nextSlideSoft();
            }
        }
    });
    presenterWindow.document.body.addEventListener("mousedown", (e) => {
        if (isPresenting && (e.which == 1 || e.which == 3)) {
            if (e.which == 1) nextSlideSoft();
            if (e.which == 3) prevSlideSoft();
            e.preventDefault();
        }
    });
    presenterWindow.setInterval(()=>{
        if (currentSlideIdx <= 1) presenterTimer = Date.now();
        const presenterSeconds = (Date.now()-presenterTimer)/1000;
        presenterWindow.document.querySelector("#timer").innerText = `${(presenterSeconds/60/60).toFixed().padStart(2,0)}:${((presenterSeconds/60)%60).toFixed().padStart(2,0)}:${(presenterSeconds%60).toFixed().padStart(2,0)}`;
    },1000)
    updateNextSlidePreview();
}

async function loadExportData() {
    const expblobrt = await (await fetch(exportData)).blob();
    const exstream = expblobrt.stream().pipeThrough(new DecompressionStream("gzip"));
    const exresult = await new Response(exstream).json();
    allSlides = exresult.allSlides;
    cachedSlidePreviews = exresult.cachedSlidePreviews;
    cachedFileData = exresult.cachedFileData;
    renderedSlides = exresult.renderedSlides;
    liteModeCheck.checked = true;
    isEditing = false;
};

function getSizeString(byteCount) {
    if (byteCount < 1024) {
        return `${Math.floor(byteCount)} B`;
    }
    if (byteCount < 1024*1024) {
        return `${(byteCount/1024).toFixed(2)} kB`;
    }
    if (byteCount < 1024*1024*1024) {
        return `${(byteCount/1024/1024).toFixed(2)} MB`;
    }
    return `${(byteCount/1024/1024/1024).toFixed(2)} GB`;
}

async function exportProject() {
    let exportSummary = `[ Export summary ]\n`;
    await dumpSlideData();
    const time_exportStart = Date.now();
    await renderSlides();
    const time_renderDone = Date.now();
    let exportHtml = await (await fetch("index.html", {cache: "no-store"})).text();
    exportHtml = await replaceAsync(exportHtml, /<script type="text\/javascript" src="([^"]+.js)"><\/script>/g, async (match,js) => {
        const resText = await (await fetch(js, {cache: "no-store"})).text();
        return `\x3cscript>\n${resText}\n\x3c/script>`;
    });
    exportHtml = await replaceAsync(exportHtml, /<link rel="stylesheet" type="text\/css" href="([^"]+.css)">/g, async (match,css) => {
        const resText = await (await fetch(css, {cache: "no-store"})).text();
        return `\x3cstyle>\n${resText}\n\x3c/style>`;
    });
    exportHtml = exportHtml.replace("const isEx"+"port = false;", "const isEx"+"port = true;");
    const time_baseDone = Date.now();
    exportSummary += `Base HTML: ${getSizeString(exportHtml.length)}\n`;
    const exportedData = {allSlides: allSlides.map(e=>({...e,state:null})), cachedSlidePreviews, cachedFileData, renderedSlides};
    exportSummary += `allSlides: ${getSizeString(JSON.stringify(exportedData.allSlides).length)}\n`;
    exportSummary += `cachedSlidePreviews: ${getSizeString(JSON.stringify(exportedData.cachedSlidePreviews).length)}\n`;
    exportSummary += `cachedFileData: ${getSizeString(JSON.stringify(exportedData.cachedFileData).length)}\n`;
    exportSummary += `renderedSlides: ${getSizeString(JSON.stringify(exportedData.renderedSlides).length)}\n`;

    const exportStream = new Blob([JSON.stringify(exportedData)], {
        type: 'application/json',
    }).stream().pipeThrough(new CompressionStream("gzip"));
    const exportCompressed = await new Promise(async (resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('loadend', (e) => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
        } else {
            reject(reader.error);
        }
        });
        reader.readAsDataURL(await(await new Response(exportStream)).blob());
    });

    exportHtml = exportHtml.replace("const ex"+"portData = '';", `const ex${""}portData = ${JSON.stringify(exportCompressed)};`);
    exportSummary += `Total size: ${getSizeString(exportHtml.length)}\n`;    
    const time_htmlDone = Date.now();
    download(new Blob([exportHtml], {type: 'text/html'}), `${PROJECT_NAME}.html`);
    const time_exportDone = Date.now();
    exportSummary += `---\n`;    
    exportSummary += `Slide rendering: ${((time_renderDone - time_exportStart)/1000).toFixed(4)}s\n`;    
    exportSummary += `Base HTML: ${((time_baseDone - time_renderDone)/1000).toFixed(4)}s\n`;    
    exportSummary += `Complete HTML: ${((time_htmlDone - time_baseDone)/1000).toFixed(4)}s\n`;    
    exportSummary += `Download: ${((time_exportDone - time_htmlDone)/1000).toFixed(4)}s\n`;    
    exportSummary += `Total export time: ${((time_exportDone - time_exportStart)/1000).toFixed(4)}s\n`;
    console.log(exportSummary);
    alert(exportSummary);
}

async function renderSlides() {
    togglePresenting(true);
    slidesPreviewDiv.style.scale = "none";
    const stream = await navigator.mediaDevices.getDisplayMedia({
        preferCurrentTab: true,
    });
    const [track] = stream.getVideoTracks();
    const restrictionTarget = await RestrictionTarget.fromElement(slidesPreviewDiv);
    await track.restrictTo(restrictionTarget);
    const imageCapture = new ImageCapture(track);



    isEditing = false;
    selectSlide(0);
    selectSlide(0);
    while (currentSlideIdx < allSlides.length - 1) {
        nextSlideSoft();
        const renderIndex = `${currentSlideIdx},${currentAnimation}`;
        document.querySelectorAll(`.body.${allSlides[previewSlideIdx].id}, .body.${allSlides[previewSlideIdx].id} *`).forEach(e => {
            e.style.transition = "none";
        });
        try {
            await new Promise(requestAnimationFrame);
            await new Promise(requestAnimationFrame);
            await new Promise(requestAnimationFrame);
            await new Promise(r => setTimeout(r, 32));
            //const renderPng = await domtoimage.toPng(slidesPreviewDivInner, {rWidth: 960, rHeight: 540});
            //const renderPng = await domtoimage.toJpeg(slidesPreviewDivInner, {rWidth: 960, rHeight: 540, quality: 0.8});
            const renderFrame = await imageCapture.grabFrame();
            const canvas = document.createElement("canvas");
            canvas.width = 768;
            canvas.height = 432;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(renderFrame, 0, 0, canvas.width, canvas.height);
            const renderPng = canvas.toDataURL('image/jpeg', 0.8);

            await new Promise(requestAnimationFrame);
            await new Promise(requestAnimationFrame);
            await new Promise(requestAnimationFrame);
            renderedSlides[renderIndex] = renderPng;
            document.querySelector("lite-bar").style.backgroundImage = `url(${renderPng})`;
        } catch {
           console.error(`Error while rendering ${renderIndex}`);
        }
    }
    slidesPreviewDiv.style.scale = null;
    togglePresenting(true);
}

function getEditor() {
    editor = bundledEditor.getEditor(document.querySelector("#editorDiv"), allSlides[currentSlideIdx].code);
    lastEditorState = editor.state;
    return editor;
}

function updateProjectModified(setModified) {
    if (projectModified != setModified)
        document.title = `${setModified?'*':''}${PROJECT_NAME} - heartslides`;
    projectModified = setModified;
}

let projectModified = true;
let projectFile;
let projectDir;
let filesDir;

async function dumpSlideData() {
    const data = {
        version: 1.0,
        allSlides: allSlides.map(e=>({...e,state:null})),
        cachedSlidePreviews
    }
    const writable = await projectFile.createWritable();
    await writable.write(JSON.stringify(data));
    await writable.close();
}

/*
fileOrHandle:
- FileSystemFileHandle
- File
readType:
- ArrayBuffer
- DataURL
- Text
*/
async function readFile(fileOrHandle, readType) {
    const handle = fileOrHandle instanceof File ? fileOrHandle : (await fileOrHandle.getFile());
    return await new Promise(function(resolve, reject) {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.onerror = (e) => {
            alert("Error reading file")
            console.error(`Error reading file ${fileOrHandle}`);
            console.error(e);
            reject();
        };
        if (readType == "ArrayBuffer") reader.readAsArrayBuffer(handle);
        else if (readType == "DataURL") reader.readAsDataURL(handle);
        else if (readType == "Text") reader.readAsText(handle);
        else alert("no read type specified");
    });

}

function download(blob, filename) {
    const a = document.createElement("a"),
         url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);  
    }, 0); 
}

async function openProjectZip() {
    const fileDom = document.createElement("input");
    fileDom.type = "file";
    document.body.appendChild(fileDom);
    fileDom.click();
    const data = await new Promise(function(resolve, reject) {
        fileDom.addEventListener("change", () => {
            if (fileDom.files.length === 1) {
                resolve(fileDom.files[0]);
            } else {
                reject();
            }
        });
    });
    const zip = new JSZip();
    await zip.loadAsync(data, {createFolders: true});
    if (!zip.file("project.json")) return console.error("Not a valid project file");
    await projectDir.removeEntry("files", {recursive: true});
    filesDir = await projectDir.getDirectoryHandle("files", { create: true });
    const zipEntries = [];
    zip.forEach(e=>zipEntries.push(zip.file(e)));
    for (const e of zipEntries) {
        let targetHandle;
        if (e == null) continue;
        if (e.name == "project.json") {
            targetHandle = await projectDir.getFileHandle("project.json", { create: true });
        } else if (e.name.startsWith("files/")) {
            targetHandle = await filesDir.getFileHandle(e.name.split("/").at(-1), { create: true });
        } else {
            continue;
        }
        const writable = await targetHandle.createWritable();
        await writable.write(await e.async("arraybuffer"));
        await writable.close();
    }
    document.location.reload();
    /*
    setTimeout(() => {
        document.body.removeChild(fileDom);
    }, 0);
    */
}

async function createProjectZip() {
    const zip = new JSZip();
    await recurseZipFolder(zip, projectDir, "");
    return await zip.generateAsync({type:"blob"});
}

async function downloadProjectZip() {
    download(await createProjectZip(), `${PROJECT_NAME}.zip`);
}

async function recurseZipFolder(zip, folderHandle, path) {
    for await (const value of folderHandle.values()) {
        if (value.kind === 'file') {
            zip.file(path + value.name, await readFile(value, "ArrayBuffer"));
        } else if (value.kind === 'directory') {
            await recurseZipFolder(zip, value, path + value.name + "/");
        } else {
            alert(`Unknown handle kind: ${value.kind}`);
        }
    }
    return zip;
}

async function setupStorage(projectName) {
    const root = await navigator.storage.getDirectory();
    projectDir = await root.getDirectoryHandle(projectName, { create: true });
    //slidesDir = await projectDir.getDirectoryHandle("slides", { create: true });
    filesDir = await projectDir.getDirectoryHandle("files", { create: true });
    try {
        projectFile = await projectDir.getFileHandle("project.json", { create: false });
    } catch {
        projectFile = await projectDir.getFileHandle("project.json", { create: true });
        addSlide(false);
        await dumpSlideData();
    }
    const projectData = JSON.parse(await readFile(projectFile, "Text"));
    allSlides = projectData.allSlides;
    cachedSlidePreviews = projectData.cachedSlidePreviews;
    for await (const value of filesDir.values()) {
        if (value.kind === 'file') {
            cachedFileData[value.name] = await readFile(value, "DataURL");
        }
    }
}

async function dropNewFile(file) {
    const fnSplit = file.name.split(".");
    const filename = fnSplit.slice(0,fnSplit.length-1).join(".") + "-" + Math.random().toString(36).split(".")[1] + "." + fnSplit.at(-1);
    const targetFile = await filesDir.getFileHandle(filename, { create: true });
    const writable = await targetFile.createWritable();
    await writable.write(file);
    await writable.close();
    return filename;
}

async function fileAdded(file) {
    if (!file.type.startsWith("image/") && !file.type.startsWith("image/")) return console.error(`${file.type} not an image!`);
    const newFilename = await dropNewFile(file);
    cachedFileData[newFilename] = await readFile(file, "DataURL");
    editor.dispatch({
        changes: {from: editor.state.doc.toString().length, insert: `\n<img src="FILE(${newFilename})">`}
    });
}

function togglePresenting(noFullscreen) {
    isPresenting = !isPresenting;
    isEditing = !isPresenting && !liteModeCheck.checked;
    if (isPresenting) {
        slidesPreviewDiv.style.scale = "";
        slidesPreviewDiv.style.transform = "";
        document.body.classList.add("presenting");
        if (!noFullscreen)
            document.body.requestFullscreen();
    } else {
        document.body.style.cursor = "";
        slidesOverlay.style.display="none";
        mouseHidden = false;
        document.body.classList.remove("presenting");
        if (document.fullscreenElement)
            document.exitFullscreen();
    }
}

function setupKeybinds() {
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (e.shiftKey) downloadProjectZip();
      else saveProject();
    }
    if (e.ctrlKey && e.key === 'o') {
      e.preventDefault();
      openProjectZip();
    }
    if (e.ctrlKey && e.key === 'F') {
      e.preventDefault();
      togglePresenting();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (isPresenting) {
            e.preventDefault();
            prevSlideSoft();
        }
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === " ") {
        if (isPresenting) {
            e.preventDefault();
            nextSlideSoft();
        }
    }
    if (e.key === 'Escape') {
        if (isPresenting)
            togglePresenting();
    }
  });

  window.addEventListener("contextmenu", (e) => {
    if (isPresenting) {
        e.preventDefault();
        return false;
    }
    return true;
  });
  window.addEventListener("fullscreenchange", (event) => {
    if (isPresenting && !document.fullscreenElement)
        togglePresenting();
  })

  window.addEventListener("dragover", (e) => {
    e.preventDefault();
  });
  window.addEventListener("drop", (e) => {
    e.preventDefault();
  });
  document.addEventListener("drop", (e) => {
    e.preventDefault();
    [...e.dataTransfer.items].forEach((item, i) => {
      // If dropped items aren't files, reject them
      if (item.kind === "file") {
        const file = item.getAsFile();
        fileAdded(file);
      }
    });
  });
  document.addEventListener("paste", (e) => {
    for (const clipboardItem of e.clipboardData.files) {
      fileAdded(clipboardItem);
    }
  });
  window.onbeforeunload = function(){
    if (projectModified)
        return 'Are you sure you want to leave?';
  };
  liteModeCheck.onchange = (e) => isEditing = !liteModeCheck.checked;
}

async function init() {
    //await initData();
    loadingText.innerText = "Loading data..."
    if (!isExport)
        await setupStorage(PROJECT_NAME);
    if (isExport)
        await loadExportData();
    getEditor();
    updateSlidesList();
    updatePreview();
    updateProjectModified(false);
    setupKeybinds();
    //await loadAllPreviews();
    loadingText.innerText = "Almost done"
    requestAnimationFrame(animate);
    if (isExport) {
        loadingText.innerText = "Loading fonts..."
        selectSlide(0);selectSlide(0);
        setTimeout(()=>selectSlide(1),1000);
    }
    loadingText.style.display = "none";
}

init();
