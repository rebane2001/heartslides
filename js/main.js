const PROJECT_NAME = "project_1";
const SLIDE_WIDTH = 768;
const SLIDE_HEIGHT = 432;

const slidesAside = document.querySelector("slides-aside");
const slidesPreview = document.querySelector("slides-preview");
const slidesPreviewDiv = document.querySelector("slides-preview > div > div");
const slidesPreviewDivInner = document.querySelector("slides-preview > div > div > .body");
slidesPreview.addEventListener("wheel", (e) => {
    const deltaY = e.deltaY;
    const zoomSpeed = 2;
    const oldScale = parseFloat(getComputedStyle(slidesPreviewDiv).scale);
    const newScale = oldScale - (oldScale/1000)*deltaY*zoomSpeed;
    slidesPreviewDiv.style.scale = newScale;
});

function dragSlidesPreview(x,y) {
    const scale = parseFloat(getComputedStyle(slidesPreviewDiv).scale);
    slidesPreviewX -= (lastMouseX - x)/scale;
    slidesPreviewY -= (lastMouseY - y)/scale;
    slidesPreviewDiv.style.transform = `translate(${slidesPreviewX}px, ${slidesPreviewY}px)`;
}

let lastMiddleMouseDown = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let dragMouseX = 0;
let dragMouseY = 0;
let slidesPreviewX = 0;
let slidesPreviewY = 0;
slidesPreview.addEventListener("mousedown", (e) => {
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
    const stateText = state.doc.toString().replace(/(<[a-z][^<>]*)>/g, "$1DATACODEINDEX>").split("DATACODEINDEX").map((e,i) => (i==elIdx?e+"DATACODESPLIT":e)).join("");
    const el = slidesPreviewDivInner.querySelector(`[data-code-index="${elIdx}"]`);
    return {state, stateText, el};
}

function highlightHoverEl(el) {
    document.querySelectorAll("[data-code-hover-highlight]").forEach(e=>delete e.dataset.codeHoverHighlight);
    if (el && "codeIndex" in el.dataset) el.dataset.codeHoverHighlight = 1;
}

let draggedElIdx = -1;
function startDraggingSelected(target) {
    if (!("codeIndex" in target.dataset)) {
        draggedElIdx = -1;
        return;
    }
    draggedElIdx = parseInt(target.dataset.codeIndex);
    const {state, stateText, el} = findElByIdx(draggedElIdx);
    const oldMargin = el.style.margin;
    el.style.margin = "0px";
    const sldRect = slidesPreviewDivInner.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const absX = (elRect.x - sldRect.x)/sldRect.width*SLIDE_WIDTH;
    const absY = (elRect.y - sldRect.y)/sldRect.height*SLIDE_HEIGHT;
    el.dataset.absX = absX;
    el.dataset.absY = absY;
    el.style.margin = oldMargin;
}

function applyDrag() {
    if (draggedElIdx == -1) return;
    const {state, stateText, el} = findElByIdx(draggedElIdx);
    const htmlText = stateText.split("DATACODESPLIT")[0].replace(/^[\s\S]*(<[a-z][^<>]*)$/m, "$1");
    const to = stateText.split("DATACODESPLIT")[0].length;
    const from = to - htmlText.length;
    const newHtmlText = htmlText.replace(/data-abs-.=["'0-9\.]+/g, "").replace(/ +$/,'') + ` data-abs-x=${+parseFloat(el.dataset.absX).toFixed(3)} data-abs-y=${+parseFloat(el.dataset.absY).toFixed(3)}`;
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

function updatePreview() {
    previewNeedsUpdate = false;
    const state = previewSlideIdx == currentSlideIdx ? editor.state : (allSlides[previewSlideIdx].state || editor.state);
    let stateText = "";
    let textPos = 0;
    state.selection.ranges.forEach(({from, to})=>{
        stateText += state.doc.toString().slice(textPos, from);
        stateText += state.doc.toString().slice(from, to).replace(/(<[a-z][^<>]*)>/g, "$1 data-code-selected>");
        textPos = to;
    });
    stateText += state.doc.toString().slice(textPos);
    stateText = stateText.replace(/(<[a-z][^<>]*)>/g, "$1 data-code-index=DATACODEINDEX>").split("DATACODEINDEX").map((e,i) => (e.endsWith("=")?e+i:e)).join("");
    stateText = stateText.split("FILE(").map((e,i) => (i?cachedFileData[e.split(")")[0]] + e.replace(/^.*\)/,''):e)).join("");
    slidesPreviewDivInner.innerHTML = allSlides[0].code + stateText;
}

let editor;
let cachedFileData = {};

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
    requestAnimationFrame(animate);
}

let currentSlideIdx = 1;
let previewSlideIdx = 1;
let allSlides = [
    {name:"global",code:"<style>.body {\n  \n}</style>",state:null},
    {name:"Slide A",code:"<h1>Sample Text</h1>\n<style>.body {\n  \n}</style>",state:null},
    {name:"Slide B",code:"<h1>Sample Text</h1>\n<style>.body {\n  \n}</style>",state:null},
];

function selectSlide(i) {
    allSlides[currentSlideIdx].state = editor.state;
    const newState = allSlides[i].state ?? bundledEditor.getState(allSlides[i].code);
    editor.setState(newState);
    lastEditorState = editor.state;
    if (i != 0)
        previewSlideIdx = i;
    currentSlideIdx = i;
    updateSlidesList();
    updatePreview();
}

function updateSlidesList() {
    slidesAside.innerText = "";
    allSlides.forEach((e,i) => {
        const slideListItem = document.createElement("slide-list-item");
        slideListItem.innerText = `#${i} - ${e.name}`;
        if (currentSlideIdx == i) slideListItem.classList.add("selected");
        slideListItem.onclick = () => selectSlide(i);
        slidesAside.appendChild(slideListItem);
    });
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
    const writable = await projectFile.createWritable();
    await writable.write(JSON.stringify(allSlides.map(e=>({...e,state:null}))));
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

async function openProjectZip() { /* todo: make this load stuff */
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
    await zip.loadAsync(data);
    zip.forEach((e) => console.log(e));
    setTimeout(() => {
        document.body.removeChild(fileDom);
    }, 0);
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
        await dumpSlideData();
    }
    allSlides = JSON.parse(await readFile(projectFile, "Text"));
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

/*
let slideDb;

async function initData() {
    const request = await new Promise(function(resolve, reject) {
        const r = window.indexedDB.open("HeartSlides", 1);
        r.onsuccess = (e) => {
            slideDb = e.target.result;
            resolve(slideDb);
        }
        r.onerror = (e) => {
            alert("indexedDB error");
            console.error(e);
            reject();
        }
    });
}
*/

async function fileAdded(file) {
    if (!file.type.startsWith("image")) return console.error(`${file.type} not an image!`);
    const newFilename = await dropNewFile(file);
    cachedFileData[newFilename] = await readFile(file, "DataURL");
    editor.dispatch({
        changes: {from: editor.state.doc.toString().length, insert: `\n<img src="FILE(${newFilename})">`}
    });
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
  });

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
    requestAnimationFrame(animate);
}

init();
