import { expect, test } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const sourceComponent = ({ id, name }: { id: string; name: string }) => ({
  type: "source_component",
  source_component_id: id,
  ftype: "simple_chip",
  name,
  manufacturer_part_number: name,
  supplier_part_numbers: {},
})

const schematicComponent = ({
  id,
  sourceComponentId,
  x,
  y,
}: {
  id: string
  sourceComponentId: string
  x: number
  y: number
}) => ({
  type: "schematic_component",
  schematic_component_id: id,
  source_component_id: sourceComponentId,
  center: { x, y },
  size: { width: 0.6, height: 0.65 },
  is_box_with_pins: true,
})

const misplacedCircuitJson = [
  sourceComponent({ id: "source_y1101", name: "Y1101" }),
  sourceComponent({ id: "source_c1101", name: "C1101" }),
  sourceComponent({ id: "source_c1103", name: "C1103" }),
  schematicComponent({
    id: "schematic_y1101",
    sourceComponentId: "source_y1101",
    x: 0,
    y: 0,
  }),
  schematicComponent({
    id: "schematic_c1101",
    sourceComponentId: "source_c1101",
    x: 2.5,
    y: 2,
  }),
  schematicComponent({
    id: "schematic_c1103",
    sourceComponentId: "source_c1103",
    x: 5,
    y: 0,
  }),
]

const referenceSchematic = {
  coordinateSystem: "screen",
  components: [
    { name: "Y1101", center: { x: 0, y: 100 } },
    { name: "C1101", center: { x: 400, y: 0 } },
    { name: "C1103", center: { x: 400, y: 200 } },
  ],
}

test("optimize-schematic recommends score-improving tscircuit props", async () => {
  const { runCommand, tmpDir } = await getCliTestFixture()
  const circuitJsonPath = path.join(tmpDir, "misplaced.circuit.json")
  const referencePath = path.join(tmpDir, "reference.json")
  await Promise.all([
    fs.writeFile(circuitJsonPath, JSON.stringify(misplacedCircuitJson)),
    fs.writeFile(referencePath, JSON.stringify(referenceSchematic)),
  ])

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci optimize-schematic ${circuitJsonPath} --reference ${referencePath} --position-tolerance 0.2`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("Initial placement score: 13.87")
  expect(stdout).toContain("Simulated final score: 100")
  expect(stdout).toContain("Termination: placement_matched")
  expect(stdout).toContain("C1101: schX={4.053} schY={1.386}")
  expect(stdout).toContain("C1103: schX={4.321} schY={-0.512}")
})

test("optimize-schematic emits machine-readable output", async () => {
  const { runCommand, tmpDir } = await getCliTestFixture()
  const circuitJsonPath = path.join(tmpDir, "misplaced.circuit.json")
  const referencePath = path.join(tmpDir, "reference.json")
  await Promise.all([
    fs.writeFile(circuitJsonPath, JSON.stringify(misplacedCircuitJson)),
    fs.writeFile(referencePath, JSON.stringify(referenceSchematic)),
  ])

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci optimize-schematic ${circuitJsonPath} --reference ${referencePath} --position-tolerance 0.2 --json`,
  )
  const output = JSON.parse(stdout)

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(output.initialScore).toBe(13.87)
  expect(output.finalScore).toBe(100)
  expect(output.steps).toHaveLength(4)
  expect(output.recommendations[0]).toEqual({
    componentName: "C1101",
    sourceComponentId: "source_c1101",
    schematicComponentId: "schematic_c1101",
    suggestedProps: { schX: 4.053, schY: 1.386 },
  })
})

test("optimize-schematic rejects malformed reference JSON", async () => {
  const { runCommand, tmpDir } = await getCliTestFixture()
  const circuitJsonPath = path.join(tmpDir, "misplaced.circuit.json")
  const referencePath = path.join(tmpDir, "reference.json")
  await Promise.all([
    fs.writeFile(circuitJsonPath, JSON.stringify(misplacedCircuitJson)),
    fs.writeFile(
      referencePath,
      JSON.stringify({ components: [{ name: "R1" }] }),
    ),
  ])

  const { stderr, exitCode } = await runCommand(
    `tsci optimize-schematic ${circuitJsonPath} --reference ${referencePath}`,
  )

  expect(exitCode).toBe(1)
  expect(stderr).toContain(
    "Reference JSON must contain components with a name and finite center coordinates",
  )
})
