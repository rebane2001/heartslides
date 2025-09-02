import {EditorView, basicSetup} from "codemirror"
import {indentWithTab} from "@codemirror/commands"
import {acceptCompletion} from "@codemirror/autocomplete"
import {keymap} from "@codemirror/view"
import {html} from "@codemirror/lang-html"

export function getEditor(parent) {
  const editor = new EditorView({
    extensions: [basicSetup, keymap.of([{ key: "Tab", run: acceptCompletion }, indentWithTab]), html()],
    parent: parent
  });
  return editor;
}
