// const PROJECT_NAME = "project_1";
const PROJECT_NAME = "css_bsides_tll_2025";
const SLIDE_WIDTH = 768;
const SLIDE_HEIGHT = 432;
let isPresenting = false;
let isEditing = true;

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
        if (e.which == 1) nextSlide();
        if (e.which == 3) prevSlide();
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
    if (e.which == 2) dragSlidesPreview(e.clientX, e.clientY);
    if (e.which == 1) dragSelected(e.clientX, e.clientY);
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    lastMiddleMouseDown = 0;
    lastMouseMove = Date.now();
    if (mouseHidden) {
        document.body.style.cursor = "";
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
            slidesPreviewX = 0;
            slidesPreviewY = 0;
            slidesPreviewDiv.style.scale = "";
            slidesPreviewDiv.style.transform = "";
        }
    }
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

function findElByIdx(elIdx) {
    const state = previewSlideIdx == currentSlideIdx ? editor.state : (allSlides[previewSlideIdx].state || editor.state);
    const stateText = state.doc.toString().replace(/(<[a-z][^<>]*?)>/g, "$1DATACODEINDEX>").split("DATACODEINDEX").map((e,i) => (i==elIdx?e+"DATACODESPLIT":e)).join("");
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
}

function playAnimation() {
    slidesPreviewDivInner.classList.add("starting-style");
    requestAnimationFrame(()=>slidesPreviewDivInner.classList.remove("starting-style"));
}

function remapInlineFiles(text) {
    return text.split("FILE(").map((e,i) => (i?cachedFileData[e.split(")")[0]] + e.replace(/^.*?\)/,''):e)).join("");
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
    stateText = stateText.replace(/(<[a-z][^<>]*?)>/g, "$1 data-code-index=DATACODEINDEX>").split("DATACODEINDEX").map((e,i) => (e.endsWith("=")?e+i:e)).join("");
    stateText = remapInlineFiles(stateText);
    [...slidesPreviewDivInner.classList].slice(1).forEach(e=>slidesPreviewDivInner.classList.remove(e));
    slidesPreviewDivInner.classList.add(allSlides[previewSlideIdx].id);
    if (currentSlideIdx == 0 || lastGlobalState !== allSlides[0].state) {
        slidesPreviewDivGlobal.innerHTML = remapInlineFiles(allSlides[0].code);
        lastGlobalState = allSlides[0].state;
    }
    slidesPreviewDivInner.innerHTML = stateText;
    updatePreviewImage(true);
}

let editor;
let cachedFileData = {};
let cachedSlidePreviews = {};

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
    if (previewNeedsUpdate && lastEditorChange < Date.now() - PREVIEW_DEBOUNCE_MS) {
        updatePreview();
    }
    //editor.state.doc.toString();
    if (lastMouseMove + 1000 < Date.now() && isPresenting && !mouseHidden) {
        document.body.style.cursor = "none";
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
    //updatePreviewImage();
}

function prevSlide() {
    selectSlide(Math.max(1, currentSlideIdx - 1));
}

function nextSlide() {
    selectSlide(Math.min(allSlides.length-1, currentSlideIdx + 1));
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

function moveSlide(from, to) {
    if (to <= 0 || to >= allSlides.length) return;
    if (from <= 0 || from >= allSlides.length) return;
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

function updateSlidesList() {
    slidesAside.innerText = "";
    allSlides.forEach((e,i) => {
        const slideListItem = document.createElement("slide-list-item");
        slideListItem.dataset.slideIndex = i;
        if (cachedSlidePreviews[i])
            slideListItem.style.backgroundImage = `url(${cachedSlidePreviews[i]})`;
        //slideListItem.innerText = `#${i} - ${e.name}`;
        slideListItem.innerText = i?`#${i}`:'(global)';
        if (currentSlideIdx == i) slideListItem.classList.add("selected");
        slideListItem.onclick = () => selectSlide(i);
        if (i) {
            const slideListUp = document.createElement("slide-list-action");
            const slideListDown = document.createElement("slide-list-action");
            const slideListRemove = document.createElement("slide-list-action");
            slideListUp.innerText = "^";
            slideListDown.innerText = "v";
            slideListRemove.innerText = "x";
            slideListUp.onclick = (e) => {e.stopPropagation();moveSlide(i,i-1)};
            slideListDown.onclick = (e) => {e.stopPropagation();moveSlide(i,i+1)};
            slideListRemove.onclick = (e) => {e.stopPropagation();removeSlide(i)};
            slideListItem.appendChild(slideListUp);
            slideListItem.appendChild(slideListDown);
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

function togglePresenting() {
    isPresenting = !isPresenting;
    isEditing = !isPresenting;
    if (isPresenting) {
        slidesPreviewDiv.style.scale = "";
        slidesPreviewDiv.style.transform = "";
        document.body.classList.add("presenting");
        document.body.requestFullscreen();
    } else {
        document.body.style.cursor = "";
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
            prevSlide();
        }
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === " ") {
        if (isPresenting) {
            e.preventDefault();
            nextSlide();
        }
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
}

async function init() {
    //await initData();
    await setupStorage(PROJECT_NAME);
    getEditor();
    updateSlidesList();
    updatePreview();
    updateProjectModified(false);
    setupKeybinds();
    //await loadAllPreviews();
    requestAnimationFrame(animate);
}

init();
