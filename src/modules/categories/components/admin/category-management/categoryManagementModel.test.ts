import { describe, expect, it } from 'vitest'
import {
  capitalizeCategoryWords,
  createCategoryEditForm,
  generateCategorySlug,
  getCategoryDeleteError,
  getCategoryTableTitle,
} from './categoryManagementModel'

describe('category management model', () => {
  it('normalizes names and derives the same slug shown by the form', () => {
    expect(capitalizeCategoryWords('iNDUSTRY news')).toBe('Industry News')
    expect(generateCategorySlug(' Industry  News -- Updates! ')).toBe(
      'industry-news-updates'
    )
  })

  it('rebuilds the slug from the current name when editing', () => {
    expect(
      createCategoryEditForm({
        id: 4,
        name: 'Company Updates',
        description: undefined,
        createdAt: '2026-07-30T00:00:00.000Z',
      })
    ).toEqual({
      name: 'Company Updates',
      slug: 'company-updates',
      description: '',
    })
  })

  it('returns a useful error when posts still reference a category', () => {
    expect(
      getCategoryDeleteError(new Error('foreign key constraint failed'), 'News')
    ).toContain(
      'Cannot delete "News" - this category is being used by one or more posts.'
    )
    expect(getCategoryDeleteError(new Error('Network error'), 'News')).toBe(
      'Network error'
    )
  })

  it('describes filtered and unfiltered table totals', () => {
    expect(getCategoryTableTitle('', 2, 8)).toBe('All Categories (8)')
    expect(getCategoryTableTitle('news', 1, 8)).toBe('1 result')
    expect(getCategoryTableTitle('news', 2, 8)).toBe('2 results')
  })
})
