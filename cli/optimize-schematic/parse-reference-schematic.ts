import type {
  ReferenceSchematic,
  ReferenceSchematicComponent,
} from "recreate-schematic/optimizer"

const INVALID_REFERENCE_MESSAGE =
  "Reference JSON must contain components with a name and finite center coordinates"

const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === "object" && input !== null && !Array.isArray(input)

const parseReferenceComponent = (
  componentInput: unknown,
): ReferenceSchematicComponent => {
  if (!isRecord(componentInput)) throw new Error(INVALID_REFERENCE_MESSAGE)
  if (
    typeof componentInput.name !== "string" ||
    componentInput.name.length === 0
  ) {
    throw new Error(INVALID_REFERENCE_MESSAGE)
  }
  if (!isRecord(componentInput.center)) {
    throw new Error(INVALID_REFERENCE_MESSAGE)
  }
  const x = componentInput.center.x
  const y = componentInput.center.y
  if (
    typeof x !== "number" ||
    !Number.isFinite(x) ||
    typeof y !== "number" ||
    !Number.isFinite(y)
  ) {
    throw new Error(INVALID_REFERENCE_MESSAGE)
  }
  return {
    name: componentInput.name,
    center: { x, y },
  }
}

export const parseReferenceSchematic = (
  referenceInput: unknown,
): ReferenceSchematic => {
  if (!isRecord(referenceInput) || !Array.isArray(referenceInput.components)) {
    throw new Error(INVALID_REFERENCE_MESSAGE)
  }
  const coordinateSystem = referenceInput.coordinateSystem
  if (
    coordinateSystem !== undefined &&
    coordinateSystem !== "screen" &&
    coordinateSystem !== "cartesian"
  ) {
    throw new Error(
      'Reference coordinateSystem must be "screen" or "cartesian"',
    )
  }

  return {
    coordinateSystem,
    components: referenceInput.components.map(parseReferenceComponent),
  }
}
