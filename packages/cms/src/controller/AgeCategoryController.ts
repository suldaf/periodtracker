import { getRepository } from 'typeorm'
import { NextFunction, Request, Response } from 'express'
import { AgeCategory } from '../entity/AgeCategory'
import { v4 as uuid } from 'uuid'

export class AgeCategoryController {
  private ageCategoryRepository = getRepository(AgeCategory)

  async all(request: Request, response: Response, next: NextFunction) {
    return this.ageCategoryRepository.find({
      where: [{ lang: request.user.lang }, { isGlobal: true }],
      order: {
        sortingKey: 'ASC',
      },
    })
  }

  async one(request: Request, response: Response, next: NextFunction) {
    return this.ageCategoryRepository.findOne(request.params.id as unknown as number)
  }

  async save(request: Request, response: Response, next: NextFunction) {
    const ageCategory = await this.ageCategoryRepository.findOne({
      where: [
        {
          name: request.body.name,
          lang: request.user.lang,
        },
        {
          name: request.body.name,
          isGlobal: true,
        },
      ],
    })
    if (ageCategory) {
      return { ageCategory, isExist: true }
    }
    const ageCategoryToSave = request.body
    ageCategoryToSave.minAge = request.body.minAge ? Number(request.body.minAge) : null
    ageCategoryToSave.maxAge = request.body.maxAge ? Number(request.body.maxAge) : null
    ageCategoryToSave.isGlobal = request.body.isGlobal === 'true'
    ageCategoryToSave.lang = request.user.lang
    ageCategoryToSave.id = uuid()
    await this.ageCategoryRepository.save(ageCategoryToSave)
    return ageCategoryToSave
  }

  async update(request: Request, response: Response, next: NextFunction) {
    const ageCategoryToUpdate = await this.ageCategoryRepository.findOne(request.params.id as unknown as number)

    if (Number(request.body.toggleOnly) > 0) {
      ageCategoryToUpdate.isGlobal = request.body.isGlobal === 'true'
      await this.ageCategoryRepository.save(ageCategoryToUpdate)
      return ageCategoryToUpdate
    }

    const ageCategory = await this.ageCategoryRepository.findOne({
      where: [
        {
          name: request.body.name,
          lang: request.user.lang,
        },
        {
          name: request.body.name,
          isGlobal: true,
        },
      ],
    })
    if (ageCategory && request.params.id !== ageCategory.id) {
      return { ageCategory, isExist: true }
    }

    ageCategoryToUpdate.name = request.body.name
    ageCategoryToUpdate.minAge = request.body.minAge ? Number(request.body.minAge) : null
    ageCategoryToUpdate.maxAge = request.body.maxAge ? Number(request.body.maxAge) : null
    ageCategoryToUpdate.isGlobal = request.body.isGlobal === 'true'
    ageCategoryToUpdate.lang = request.user.lang
    await this.ageCategoryRepository.save(ageCategoryToUpdate)
    return ageCategoryToUpdate
  }

  async remove(request: Request, response: Response, next: NextFunction) {
    const ageCategoryToRemove = await this.ageCategoryRepository.findOne(request.params.id as unknown as number)
    await this.ageCategoryRepository.remove(ageCategoryToRemove)
    return ageCategoryToRemove
  }
}
