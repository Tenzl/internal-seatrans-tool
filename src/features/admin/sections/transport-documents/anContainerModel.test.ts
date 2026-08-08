import { describe, expect, it } from 'vitest'
import {
  anContainersToBlCargoTextFields,
  anContainersToCargoRows,
  anContainersToVolumeText,
  anNumericInputValue,
  emptyAnContainer,
  legacyBlCargoTextToContainers,
  legacyCargoRowToAnContainer,
  normalizeAnContainers,
  parseAnNumericField,
  seedAnContainersFromVolumes,
  summarizeAnContainers,
} from './anContainerModel'

describe('anContainerModel', () => {
  it('normalizes structured containers and clears unknown types', () => {
    expect(
      normalizeAnContainers({
        containers: [
          {
            type: "20'DC",
            containerNo: ' SITU2608023 ',
            sealNo: ' SITR892061 ',
            grossWeight: '21000',
            measurement: '7.86',
            tare: '',
            packageType: 'CRATE(S)',
            noOfPkgs: '21',
            note: 'ok',
            method: 'SM1',
          },
          { type: 'NOPE', containerNo: 'X' },
        ],
      })
    ).toEqual([
      {
        type: "20'DC",
        containerNo: 'SITU2608023',
        sealNo: 'SITR892061',
        grossWeight: '21000',
        measurement: '7.86',
        tare: '',
        packageType: 'CRATE(S)',
        noOfPkgs: '21',
        note: 'ok',
        method: 'SM1',
      },
      {
        ...emptyAnContainer(),
        containerNo: 'X',
      },
    ])
  })

  it('migrates legacy cargoRows when containers are absent', () => {
    expect(
      normalizeAnContainers({
        cargoRows: [
          {
            containerSealNumber: 'CMAU8501220 / R7540686',
            quantity: '930 CARTONS',
            descriptionOfGoods: 'GREEN TEA',
            grossWeight: '16,368 KGS',
            measurement: '63.9 CBM',
          },
        ],
      })
    ).toEqual([
      {
        ...emptyAnContainer(),
        containerNo: 'CMAU8501220',
        sealNo: 'R7540686',
        noOfPkgs: '930 CARTONS',
        note: 'GREEN TEA',
        grossWeight: '16,368 KGS',
        measurement: '63.9 CBM',
      },
    ])
  })

  it('prefers containers over legacy cargoRows', () => {
    expect(
      normalizeAnContainers({
        containers: [{ type: "40'HC", containerNo: 'NEW' }],
        cargoRows: [
          {
            containerSealNumber: 'OLD',
            quantity: '1',
            descriptionOfGoods: '',
            grossWeight: '',
            measurement: '',
          },
        ],
      })[0]?.containerNo
    ).toBe('NEW')
  })

  it('maps containers to one PDF/DO cargo row each', () => {
    expect(
      anContainersToCargoRows(
        [
          {
            type: "20'DC",
            containerNo: 'SITU2608023',
            sealNo: 'SITR892061',
            grossWeight: '21000',
            measurement: '7.86',
            tare: '2200',
            packageType: 'CRATE(S)',
            noOfPkgs: '21',
            note: 'FRAGILE',
            method: 'SM1',
          },
        ],
        'STONE'
      )
    ).toEqual([
      {
        containerSealNumber: 'SITU2608023 / SITR892061',
        quantity: '21 CRATE(S)',
        descriptionOfGoods: "20'DC\nTare: 2200\nSTONE\nMethod: SM1",
        grossWeight: '21000 KGS',
        measurement: '7.86 CBM',
      },
    ])
  })

  it('keeps container note out of the PDF description column', () => {
    expect(
      anContainersToCargoRows([
        {
          ...emptyAnContainer(),
          type: "20'DC",
          note: 'per-container only',
        },
      ])
    ).toEqual([
      {
        containerSealNumber: '',
        quantity: '',
        descriptionOfGoods: "20'DC",
        grossWeight: '',
        measurement: '',
      },
    ])
  })

  it('seeds empty typed rows from booking volumes without inventing numbers', () => {
    expect(seedAnContainersFromVolumes({ "20'DC": 2, "40'RF": 1 })).toEqual([
      { ...emptyAnContainer(), type: "20'DC" },
      { ...emptyAnContainer(), type: "20'DC" },
      { ...emptyAnContainer(), type: "40'RF" },
    ])
  })

  it('expands 3×20\'DC into three typed empty rows in CARGO_VOLUME_TYPES order', () => {
    const rows = seedAnContainersFromVolumes({ "20'DC": 3 })
    expect(rows).toHaveLength(3)
    expect(rows.every((row) => row.type === "20'DC")).toBe(true)
    expect(rows.every((row) => row.containerNo === '')).toBe(true)
    expect(rows.every((row) => row.grossWeight === '')).toBe(true)
  })

  it('returns no rows when volumes are empty', () => {
    expect(seedAnContainersFromVolumes({})).toEqual([])
  })

  it('splits legacy seal text on slash', () => {
    expect(
      legacyCargoRowToAnContainer({
        containerSealNumber: 'A / B / C',
        quantity: '1',
        descriptionOfGoods: 'x',
        grossWeight: '',
        measurement: '',
      }).sealNo
    ).toBe('B / C')
  })

  it('parses numeric cells with commas, units, and trailing text', () => {
    expect(parseAnNumericField('21,000')).toBe(21000)
    expect(parseAnNumericField('16,368 KGS')).toBe(16368)
    expect(parseAnNumericField('7.86 CBM')).toBe(7.86)
    expect(parseAnNumericField('930 CARTONS')).toBe(930)
    expect(parseAnNumericField('')).toBeNull()
    expect(anNumericInputValue('16,368 KGS')).toBe('16368')
  })

  it('summarizes shipment badges and paired pkg totals', () => {
    expect(
      summarizeAnContainers([
        {
          ...emptyAnContainer(),
          type: "20'DC",
          grossWeight: '21,000',
          measurement: '7.86',
          noOfPkgs: '21',
          packageType: 'CRATE(S)',
        },
        {
          ...emptyAnContainer(),
          type: "20'DC",
          grossWeight: '1,000 KGS',
          measurement: '2 CBM',
          noOfPkgs: '10',
          packageType: 'CRATE(S)',
        },
        {
          ...emptyAnContainer(),
          type: "40'HC",
          grossWeight: '',
          measurement: '',
          noOfPkgs: '5',
          packageType: 'PALLET',
        },
      ])
    ).toEqual({
      shipmentBadges: ["20'DC x 2", "40'HC x 1"],
      totalGrossWeight: 22000,
      totalMeasurement: 9.86,
      totalNoOfPkgs: 36,
      packageTypes: 'CRATE(S), PALLET',
      totalVgm: 0,
    })
  })

  it('flattens containers into BL free-text cargo columns', () => {
    expect(
      anContainersToBlCargoTextFields(
        [
          {
            ...emptyAnContainer(),
            type: "20'DC",
            note: 'ignored note',
            grossWeight: '100',
            measurement: '2',
          },
          {
            ...emptyAnContainer(),
            type: "40'HC",
            note: 'also ignored',
            grossWeight: '200',
            measurement: '4',
          },
        ],
        'STONE'
      )
    ).toEqual({
      descriptionOfGoods: 'STONE',
      grossWeight: '100 KGS\n200 KGS',
      measurement: '2 CBM\n4 CBM',
      volumeStc: '1x20DC 1x40HC CONTAINER(S) S.T.C',
    })
  })

  it('formats Volume text from typed container counts', () => {
    expect(
      anContainersToVolumeText([
        { ...emptyAnContainer(), type: "20'DC" },
        { ...emptyAnContainer(), type: "20'DC" },
        { ...emptyAnContainer(), type: "40'RF" },
        { ...emptyAnContainer(), type: '' },
      ])
    ).toBe("2 x 20'DC\n1 x 40'RF")
    expect(anContainersToVolumeText([])).toBe('')
  })

  it('seeds one container from legacy BL free-text without splitting lines', () => {
    expect(
      legacyBlCargoTextToContainers({
        descriptionOfGoods: "20'DC\nSTONE",
        grossWeight: '100\n200',
        measurement: '2',
        numberAndKindOfPackages: '10 PKGS',
      })
    ).toEqual([
      {
        ...emptyAnContainer(),
        note: "20'DC\nSTONE",
        grossWeight: '100\n200',
        measurement: '2',
        noOfPkgs: '10',
        packageType: 'PKGS',
      },
    ])
  })
})
