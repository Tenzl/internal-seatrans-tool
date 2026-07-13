export const TINYMCE_SCRIPT_SRC = '/tinymce/tinymce.min.js'

export const TINYMCE_PLUGINS = [
  'advlist',
  'autolink',
  'lists',
  'link',
  'image',
  'charmap',
  'preview',
  'anchor',
  'searchreplace',
  'visualblocks',
  'code',
  'fullscreen',
  'insertdatetime',
  'media',
  'table',
  'help',
  'wordcount',
] as const

export const TINYMCE_RUNTIME_ASSETS = [
  'tinymce.min.js',
  'icons/default/icons.min.js',
  'models/dom/model.min.js',
  'themes/silver/theme.min.js',
  'skins/ui/oxide/skin.min.css',
  'skins/ui/oxide/content.min.css',
  'skins/ui/oxide/content.inline.min.css',
  'skins/ui/oxide/skin.shadowdom.min.css',
  'skins/content/default/content.min.css',
  'plugins/help/js/i18n/keynav/en.js',
  ...TINYMCE_PLUGINS.map((plugin) => `plugins/${plugin}/plugin.min.js`),
] as const
