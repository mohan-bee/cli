import type { Command } from "commander"
import {
  type OptimizeSchematicOptions,
  formatSchematicOptimization,
  optimizeSchematic,
} from "./optimize-schematic"

export const registerOptimizeSchematic = (program: Command) => {
  program
    .command("optimize-schematic")
    .description(
      "Recommend tscircuit schematic positions from an image-derived reference",
    )
    .argument("[file]", "Path to a circuit entry file or Circuit JSON")
    .requiredOption(
      "--reference <path>",
      "Path to structured component positions extracted from the image",
    )
    .option("--json", "Print machine-readable optimization output")
    .option(
      "--max-iterations <count>",
      "Maximum number of score-improving moves",
    )
    .option(
      "--minimum-score-improvement <score>",
      "Minimum score increase required to accept a move",
    )
    .option(
      "--position-tolerance <distance>",
      "Schematic distance accepted as aligned",
    )
    .action(
      async (file: string | undefined, options: OptimizeSchematicOptions) => {
        try {
          const output = await optimizeSchematic({ file, options })
          if (options.json) {
            console.log(JSON.stringify(output, null, 2))
            return
          }
          console.log(formatSchematicOptimization(output))
        } catch (error) {
          let errorMessage = String(error)
          if (error instanceof Error) errorMessage = error.message
          console.error(errorMessage)
          process.exit(1)
        }
      },
    )
}
