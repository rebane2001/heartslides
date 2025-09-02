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
	lastMouseX = e.clientX;
	lastMouseY = e.clientY;
	dragMouseX = e.clientX;
	dragMouseY = e.clientY;
	if (e.which == 2) lastMiddleMouseDown = Date.now();
});
slidesPreview.addEventListener("mousemove", (e) => {
	if (e.which == 2) dragSlidesPreview(e.clientX, e.clientY);
	lastMouseX = e.clientX;
	lastMouseY = e.clientY;
	lastMiddleMouseDown = 0;
});
slidesPreview.addEventListener("mouseup", (e) => {
	if (e.which == 2) {
		dragSlidesPreview(e.clientX, e.clientY);
		if (lastMiddleMouseDown + 200 > Date.now())	{
			slidesPreviewX = 0;
			slidesPreviewY = 0;
			slidesPreviewDiv.style.scale = "";
			slidesPreviewDiv.style.transform = "";
		}
	}
	lastMouseX = e.clientX;
	lastMouseY = e.clientY;
});

function updatePreview() {
	previewNeedsUpdate = false;
	slidesPreviewDivInner.innerHTML = allSlides[0].code + editor.state.doc.toString();
}

let editor;

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
	}
	if (previewNeedsUpdate && lastEditorChange < Date.now() - PREVIEW_DEBOUNCE_MS) {
		updatePreview();
	}
	//editor.state.doc.toString();
	requestAnimationFrame(animate);
}

let currentSlideIdx = 0;
let allSlides = [
	{name:"global",code:"<style>.body {\n  \n}</style>",state:null},
	{name:"Slide A",code:"<h1>Sample Text</h1>\n<style>.body {\n  \n}</style>",state:null},
	{name:"Slide B",code:"<h1>Sample Text</h1>\n<style>.body {\n  \n}</style>",state:null},
];

function selectSlide(i) {
	allSlides[currentSlideIdx].state = editor.state;
	const newState = allSlides[i].state ?? bundledEditor.getState(allSlides[i].code);
	editor.setState(newState);
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

function getEditor() {
	editor = bundledEditor.getEditor(document.querySelector("#editorDiv"), allSlides[0].code);
	return editor;
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
async function init() {
	//await initData();
	getEditor();
	updateSlidesList();
	requestAnimationFrame(animate);
}

init();
