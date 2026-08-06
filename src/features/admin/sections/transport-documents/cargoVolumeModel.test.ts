import { describe, expect, it } from 'vitest'
import {
  compactCargoVolumes,
  formatCargoVolumes,
  formatVolumeForBlPdf,
  normalizeBookingCargoVolumes,
  parseCargoVolumeString,
} from './cargoVolumeModel'

describe('cargoVolumeModel', () => {
  it('formats only non-zero types on separate lines', () => {
    expect(
      formatCargoVolumes({
        "20'DC": 3,
        "40'RF": 1,
        "40'HC": 0,
      })
    ).toBe("3 x 20'DC\n1 x 40'RF")
  })

  it('formats BL PDF volume as compact STC line', () => {
    expect(formatVolumeForBlPdf({ "20'DC": 1 })).toBe(
      '1x20DC CONTAINER(S) S.T.C'
    )
    expect(formatVolumeForBlPdf({ "20'DC": 2, "40'RF": 1 })).toBe(
      '2x20DC 1x40RF CONTAINER(S) S.T.C'
    )
    expect(formatVolumeForBlPdf({})).toBe('')
  })

  it('compacts zeros and unknown keys', () => {
    expect(
      compactCargoVolumes({
        "20'DC": 3,
        "40'HC": 0,
        mystery: 9,
        "45'RF": '2',
      } as Record<string, unknown>)
    ).toEqual({
      "20'DC": 3,
      "45'RF": 2,
    })
  })

  it('parses common legacy qty x type patterns', () => {
    expect(parseCargoVolumeString("3x20'DC")).toEqual({ "20'DC": 3 })
    expect(parseCargoVolumeString("3 x 20'DC, 1 x 40'RF")).toEqual({
      "20'DC": 3,
      "40'RF": 1,
    })
    expect(parseCargoVolumeString("2 X 40'HC\n1 x 45'RF")).toEqual({
      "45'RF": 1,
      "40'HC": 2,
    })
  })

  it('leaves unparseable legacy text for PDF fallback', () => {
    expect(
      normalizeBookingCargoVolumes({ volume: '10 PKGS', cargoVolumes: {} })
    ).toEqual({
      cargoVolumes: {},
      volume: '10 PKGS',
    })
  })

  it('prefers structured cargoVolumes over legacy volume text', () => {
    expect(
      normalizeBookingCargoVolumes({
        volume: 'legacy junk',
        cargoVolumes: { "40'HQ": 2 },
      })
    ).toEqual({
      cargoVolumes: { "40'HQ": 2 },
      volume: "2 x 40'HQ",
    })
  })

  it('hydrates steppers from a parseable legacy volume string', () => {
    expect(
      normalizeBookingCargoVolumes({
        volume: "3 x 20'DC + 1 x 40'DC",
      })
    ).toEqual({
      cargoVolumes: { "20'DC": 3, "40'DC": 1 },
      volume: "3 x 20'DC\n1 x 40'DC",
    })
  })
})
