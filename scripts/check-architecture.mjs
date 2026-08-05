import fs from 'node:fs'
import path from 'node:path'

const sourceRoot = path.resolve('src')
const sourceExtensions = new Set(['.ts', '.tsx'])
const forbiddenImports = {
  shared: new Set(['app', 'features', 'modules']),
  modules: new Set(['app', 'features']),
  components: new Set(['app', 'features', 'modules']),
}

function collectSourceFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) collectSourceFiles(entryPath, files)
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(entryPath)
  }
  return files
}

const files = collectSourceFiles(sourceRoot).map(path.normalize)
const fileSet = new Set(files)
const graph = new Map(files.map((file) => [file, []]))
const violations = []
const importPattern =
  /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g

function sourceRelative(file) {
  return path.relative(sourceRoot, file).replaceAll('\\', '/')
}

function resolveSourceImport(importer, specifier) {
  let basePath
  if (specifier.startsWith('@/')) {
    basePath = path.join(sourceRoot, specifier.slice(2))
  } else if (specifier.startsWith('.')) {
    basePath = path.resolve(path.dirname(importer), specifier)
  } else {
    return null
  }

  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
  ]
  return candidates.map(path.normalize).find((candidate) => fileSet.has(candidate))
}

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  const fromLayer = sourceRelative(file).split('/')[0]
  let match
  while ((match = importPattern.exec(source))) {
    const dependency = resolveSourceImport(file, match[1])
    if (!dependency) continue
    graph.get(file).push(dependency)

    const toLayer = sourceRelative(dependency).split('/')[0]
    if (forbiddenImports[fromLayer]?.has(toLayer)) {
      violations.push(
        `${sourceRelative(file)} imports higher-level ${sourceRelative(dependency)}`
      )
    }
  }
}

const indexes = new Map()
const lowLinks = new Map()
const stack = []
const onStack = new Set()
const cycles = []
let nextIndex = 0

function findStronglyConnectedComponents(file) {
  indexes.set(file, nextIndex)
  lowLinks.set(file, nextIndex)
  nextIndex += 1
  stack.push(file)
  onStack.add(file)

  for (const dependency of graph.get(file)) {
    if (!indexes.has(dependency)) {
      findStronglyConnectedComponents(dependency)
      lowLinks.set(
        file,
        Math.min(lowLinks.get(file), lowLinks.get(dependency))
      )
    } else if (onStack.has(dependency)) {
      lowLinks.set(file, Math.min(lowLinks.get(file), indexes.get(dependency)))
    }
  }

  if (lowLinks.get(file) !== indexes.get(file)) return
  const component = []
  let current
  do {
    current = stack.pop()
    onStack.delete(current)
    component.push(current)
  } while (current !== file)

  if (component.length > 1) cycles.push(component.map(sourceRelative))
}

for (const file of files) {
  if (!indexes.has(file)) findStronglyConnectedComponents(file)
}

if (violations.length || cycles.length) {
  if (violations.length) {
    console.error('Layer violations:')
    violations.forEach((violation) => console.error(`- ${violation}`))
  }
  if (cycles.length) {
    console.error('Circular dependencies:')
    cycles.forEach((cycle) => console.error(`- ${cycle.join(' -> ')}`))
  }
  process.exitCode = 1
} else {
  console.log(
    `Architecture check passed: ${files.length} TypeScript files, no layer violations or cycles.`
  )
}
