import type { CookieOptions, Response } from 'express'
import type { Config as GeneratedTypes } from 'payload/generated-types'

import jwt from 'jsonwebtoken'

import type { Collection } from '../../collections/config/types.js'
import type { PayloadRequest } from '../../express/types.js'
import type { User } from '../types.js'

import { buildAfterOperation } from '../../collections/operations/utils.js'
import { AuthenticationError, LockedAuth } from '../../errors/index.js'
import { afterRead } from '../../fields/hooks/afterRead/index.js'
import getCookieExpiration from '../../utilities/getCookieExpiration.js'
import { initTransaction } from '../../utilities/initTransaction.js'
import { killTransaction } from '../../utilities/killTransaction.js'
import sanitizeInternalFields from '../../utilities/sanitizeInternalFields.js'
import isLocked from '../isLocked.js'
import { authenticateLocalStrategy } from '../strategies/local/authenticate.js'
import { incrementLoginAttempts } from '../strategies/local/incrementLoginAttempts.js'
import { getFieldsToSign } from './getFieldsToSign.js'
import unlock from './unlock.js'

export type Result = {
  exp?: number
  token?: string
  user?: User
}

export type Arguments = {
  collection: Collection
  data: {
    email: string
    password: string
  }
  depth?: number
  overrideAccess?: boolean
  req: PayloadRequest
  res?: Response
  showHiddenFields?: boolean
}

async function login<TSlug extends keyof GeneratedTypes['collections']>(
  incomingArgs: Arguments,
): Promise<Result & { user: GeneratedTypes['collections'][TSlug] }> {
  let args = incomingArgs

  // /////////////////////////////////////
  // beforeOperation - Collection
  // /////////////////////////////////////

  await args.collection.config.hooks.beforeOperation.reduce(async (priorHook, hook) => {
    await priorHook

    args =
      (await hook({
        args,
        context: args.req.context,
        operation: 'login',
      })) || args
  }, Promise.resolve())

  const {
    collection: { config: collectionConfig },
    data,
    depth,
    overrideAccess,
    req,
    req: {
      payload,
      payload: { config, secret },
    },
    showHiddenFields,
  } = args

  try {
    const shouldCommit = await initTransaction(req)

    // /////////////////////////////////////
    // beforeOperation - Collection
    // /////////////////////////////////////

    await args.collection.config.hooks.beforeOperation.reduce(async (priorHook, hook) => {
      await priorHook

      args =
        (await hook({
          args,
          context: args.req.context,
          operation: 'login',
        })) || args
    }, Promise.resolve())

    // /////////////////////////////////////
    // Login
    // /////////////////////////////////////

    const { email: unsanitizedEmail, password } = data

    const email = unsanitizedEmail ? unsanitizedEmail.toLowerCase().trim() : null

    let user = await payload.db.findOne<any>({
      collection: collectionConfig.slug,
      req,
      where: { email: { equals: email.toLowerCase() } },
    })

    if (!user || (args.collection.config.auth.verify && user._verified === false)) {
      throw new AuthenticationError(req.t)
    }

    if (user && isLocked(user.lockUntil)) {
      throw new LockedAuth(req.t)
    }

    const authResult = await authenticateLocalStrategy({ doc: user, password })

    user = sanitizeInternalFields(user)

    const maxLoginAttemptsEnabled = args.collection.config.auth.maxLoginAttempts > 0

    if (!authResult) {
      if (maxLoginAttemptsEnabled) {
        await incrementLoginAttempts({
          collection: collectionConfig,
          doc: user,
          payload: req.payload,
          req,
        })
      }

      throw new AuthenticationError(req.t)
    }

    if (maxLoginAttemptsEnabled) {
      await unlock({
        collection: {
          config: collectionConfig,
        },
        data,
        overrideAccess: true,
        req,
      })
    }

    const fieldsToSign = getFieldsToSign({
      collectionConfig,
      email,
      user,
    })

    await collectionConfig.hooks.beforeLogin.reduce(async (priorHook, hook) => {
      await priorHook

      user =
        (await hook({
          context: args.req.context,
          req: args.req,
          user,
        })) || user
    }, Promise.resolve())

    const token = jwt.sign(fieldsToSign, secret, {
      expiresIn: collectionConfig.auth.tokenExpiration,
    })

    if (args.res) {
      const cookieOptions: CookieOptions = {
        domain: undefined,
        expires: getCookieExpiration(collectionConfig.auth.tokenExpiration),
        httpOnly: true,
        path: '/',
        sameSite: collectionConfig.auth.cookies.sameSite,
        secure: collectionConfig.auth.cookies.secure,
      }

      if (collectionConfig.auth.cookies.domain)
        cookieOptions.domain = collectionConfig.auth.cookies.domain

      args.res.cookie(`${config.cookiePrefix}-token`, token, cookieOptions)
    }

    req.user = user

    // /////////////////////////////////////
    // afterLogin - Collection
    // /////////////////////////////////////

    await collectionConfig.hooks.afterLogin.reduce(async (priorHook, hook) => {
      await priorHook

      user =
        (await hook({
          context: args.req.context,
          req: args.req,
          token,
          user,
        })) || user
    }, Promise.resolve())

    // /////////////////////////////////////
    // afterRead - Fields
    // /////////////////////////////////////

    user = await afterRead({
      context: req.context,
      depth,
      doc: user,
      entityConfig: collectionConfig,
      overrideAccess,
      req,
      showHiddenFields,
    })

    // /////////////////////////////////////
    // afterRead - Collection
    // /////////////////////////////////////

    await collectionConfig.hooks.afterRead.reduce(async (priorHook, hook) => {
      await priorHook

      user =
        (await hook({
          context: req.context,
          doc: user,
          req,
        })) || user
    }, Promise.resolve())

    // /////////////////////////////////////
    // afterRead - Collection
    // /////////////////////////////////////

    await collectionConfig.hooks.afterRead.reduce(async (priorHook, hook) => {
      await priorHook

      user =
        (await hook({
          context: req.context,
          doc: user,
          req,
        })) || user
    }, Promise.resolve())

    let result: Result & { user: GeneratedTypes['collections'][TSlug] } = {
      exp: (jwt.decode(token) as jwt.JwtPayload).exp,
      token,
      user,
    }

    // /////////////////////////////////////
    // afterOperation - Collection
    // /////////////////////////////////////

    result = await buildAfterOperation<GeneratedTypes['collections'][TSlug]>({
      args,
      operation: 'login',
      result,
    })

    if (collectionConfig.auth.removeTokenFromResponses) {
      delete result.token
    }

    // /////////////////////////////////////
    // Return results
    // /////////////////////////////////////

    if (shouldCommit) await payload.db.commitTransaction(req.transactionID)

    return result
  } catch (error: unknown) {
    await killTransaction(req)
    throw error
  }
}

export default login