import {EditorView, basicSetup} from "codemirror"
import {EditorState} from "@codemirror/state"
import {indentWithTab} from "@codemirror/commands"
import {acceptCompletion} from "@codemirror/autocomplete"
import {keymap} from "@codemirror/view"
import {html} from "@codemirror/lang-html"

const editorExtensions = [basicSetup, keymap.of([{ key: "Tab", run: acceptCompletion }, indentWithTab]), html()];

export function getEditor(parent, doc) {
  const editor = new EditorView({
    extensions: editorExtensions,
    parent: parent,
    doc: doc ?? ""
  });
  return editor;
}

export function getState(doc) {
  const state = EditorState.create({
    doc: doc,
    extensions: editorExtensions
  });
  return state;
}
