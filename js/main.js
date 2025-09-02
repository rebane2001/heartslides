const slidesPreview = document.querySelector("slides-preview");
const slidesPreviewDiv = document.querySelector("slides-preview > div > div");
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
	slidesPreviewDiv.innerHTML = editor.state.doc.toString();
}

const editor = bundledEditor.getEditor(document.querySelector("#editorDiv"));

let lastEditorState = null;
let lastEditorChange = 0;
let previewNeedsUpdate = false;
const PREVIEW_DEBOUNCE_MS = 10;
function animate() {
	if (editor.state != lastEditorState) {
		lastEditorChange = Date.now();
		previewNeedsUpdate = true;
		lastEditorState = editor.state;
	}
	if (previewNeedsUpdate && lastEditorChange < Date.now() - PREVIEW_DEBOUNCE_MS) {
		updatePreview();
	}
	//editor.state.doc.toString();
	requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
