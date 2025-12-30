import { getRepository } from 'typeorm'
import { NextFunction, Request, Response } from 'express'
import { AgeCategory } from '../entity/AgeCategory'
import { v4 as uuid } from 'uuid'

export class AgeCategoryController {
  private ageCategoryRepository = getRepository(AgeCategory)

  async all(request: Request, response: Response, next: NextFunction) {
    return this.ageCategoryRepository.find({
      where: {
        lang: request.user.lang,
      },
      order: {
        sortingKey: 'ASC',
      },
    })
  }

  async one(request: Request, response: Response, next: NextFunction) {
    return this.ageCategoryRepository.findOne(request.params.id)
  }

  async save(request: Request, response: Response, next: NextFunction) {
    const ageCategory = await this.ageCategoryRepository.findOne({
      name: request.body.name,
      lang: request.user.lang,
    })
    if (ageCategory) {
      return { ageCategory, isExist: true }
    }
    const ageCategoryToSave = request.body
    ageCategoryToSave.lang = request.user.lang
    ageCategoryToSave.id = uuid()
    await this.ageCategoryRepository.save(ageCategoryToSave)
    return ageCategoryToSave
  }

  async update(request: Request, response: Response, next: NextFunction) {
    const ageCategory = await this.ageCategoryRepository.findOne({
      name: request.body.name,
      lang: request.user.lang,
    })
    if (ageCategory && request.params.id !== ageCategory.id) {
      return { ageCategory, isExist: true }
    }
    const ageCategoryToUpdate = await this.ageCategoryRepository.findOne(request.params.id)
    ageCategoryToUpdate.name = request.body.name
    ageCategoryToUpdate.minAge = request.body.minAge ? Number(request.body.minAge) : null
    ageCategoryToUpdate.maxAge = request.body.maxAge ? Number(request.body.maxAge) : null
    ageCategoryToUpdate.lang = request.user.lang
    await this.ageCategoryRepository.save(ageCategoryToUpdate)
    return ageCategoryToUpdate
  }

  async remove(request: Request, response: Response, next: NextFunction) {
    const ageCategoryToRemove = await this.ageCategoryRepository.findOne(request.params.id)
    await this.ageCategoryRepository.remove(ageCategoryToRemove)
    return ageCategoryToRemove
  }
}
