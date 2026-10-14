import {
  createError,
  readBody
} from 'h3'

import {
  loginSchema
} from '#shared/validators/auth'

import {
  loginUser
} from '#server/services/auth.service'

import { checkRateLimit } from '#server/utils/rate-limit'

export default defineEventHandler(async(event)=>{
  checkRateLimit(event, { keyPrefix: 'auth_login', maxRequests: 10, windowMs: 60 * 1000 })

  const body =
    await readBody(event)



  const validation =
    loginSchema.safeParse(body)



  if(!validation.success){


    throw createError({

      statusCode:422,

      statusMessage:
        'Dados inválidos.'

    })


  }



  return loginUser({

    event,

    email:
      validation.data.email,

    password:
      validation.data.password,

    role:
      validation.data.role

  })


})