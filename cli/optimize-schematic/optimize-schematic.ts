import fs from "node:fs/promises"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import {
  type SchematicPlacementOptimizationOutput,
  optimizeSchematicPlacement,
} from "recreate-schematic/optimizer"
import {
  getCircuitJsonForCheck,
  resolveCheckInputFilePath,
} from "../check/shared"
import { parseReferenceSchematic } from "./parse-reference-schematic"

export interface OptimizeSchematicOptions {
  reference: string
  json?: boolean
  maxIterations?: string
  minimumScoreImprovement?: string
  positionTolerance?: string
}

const parsePositiveNumber = ({
  input,
  optionName,
}: {
  input: string | undefined
  optionName: string
}): number | undefined => {
  if (input === undefined) return undefined
  const parsedNumber = Number(input)
  if (!Number.isFinite(parsedNumber) || parsedNumber <= 0) {
    throw new Error(`${optionName} must be a number greater than zero`)
  }
  return parsedNumber
}

const parsePositiveInteger = ({
  input,
  optionName,
}: {
  input: string | undefined
  optionName: string
}): number | undefined => {
  const parsedNumber = parsePositiveNumber({ input, optionName })
  if (parsedNumber === undefined) return undefined
  if (!Number.isInteger(parsedNumber)) {
    throw new Error(`${optionName} must be a positive integer`)
  }
  return parsedNumber
}

const parseNonNegativeNumber = ({
  input,
  optionName,
}: {
  input: string | undefined
  optionName: string
}): number | undefined => {
  if (input === undefined) return undefined
  const parsedNumber = Number(input)
  if (!Number.isFinite(parsedNumber) || parsedNumber < 0) {
    throw new Error(
      `${optionName} must be a number greater than or equal to zero`,
    )
  }
  return parsedNumber
}

export const optimizeSchematic = async ({
  file,
  options,
}: {
  file?: string
  options: OptimizeSchematicOptions
}): Promise<SchematicPlacementOptimizationOutput> => {
  const resolvedInputFilePath = await resolveCheckInputFilePath(file)
  const referencePath = path.resolve(process.cwd(), options.reference)
  const referenceInput: unknown = JSON.parse(
    await fs.readFile(referencePath, "utf8"),
  )
  const reference = parseReferenceSchematic(referenceInput)
  const circuitJson = await getCircuitJsonForCheck({
    filePath: resolvedInputFilePath,
    platformConfig: {
      pcbDisabled: true,
      routingDisabled: true,
      placementDrcChecksDisabled: true,
    } satisfies PlatformConfig,
    allowPrebuiltCircuitJson: true,
  })

  return optimizeSchematicPlacement({
    reference,
    circuitJson,
    maxIterations: parsePositiveInteger({
      input: options.maxIterations,
      optionName: "--max-iterations",
    }),
    minimumScoreImprovement: parseNonNegativeNumber({
      input: options.minimumScoreImprovement,
      optionName: "--minimum-score-improvement",
    }),
    positionTolerance: parsePositiveNumber({
      input: options.positionTolerance,
      optionName: "--position-tolerance",
    }),
  })
}

export const formatSchematicOptimization = (
  output: SchematicPlacementOptimizationOutput,
): string => {
  const lines = [
    `Initial placement score: ${output.initialScore}`,
    `Simulated final score: ${output.finalScore}`,
    `Termination: ${output.terminationReason}`,
  ]
  if (output.recommendations.length === 0) {
    lines.push("No schematic position changes recommended.")
  } else {
    lines.push("Recommended tscircuit props:")
    for (const recommendation of output.recommendations) {
      lines.push(
        `${recommendation.componentName}: schX={${recommendation.suggestedProps.schX}} schY={${recommendation.suggestedProps.schY}}`,
      )
    }
  }
  for (const issue of output.unresolvedIssues) {
    if (issue.type !== "missing_component") continue
    lines.push(`Missing component: ${issue.componentName}`)
  }
  return lines.join("\n")
}
