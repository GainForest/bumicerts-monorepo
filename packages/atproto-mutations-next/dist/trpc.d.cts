import * as _gainforest_atproto_mutations_core from '@gainforest/atproto-mutations-core';
import { AtprotoAgent } from '@gainforest/atproto-mutations-core';
import * as _trpc_server from '@trpc/server';
import { TRPCError } from '@trpc/server';
import { Layer, Effect } from 'effect';
import { AuthSetup } from '@gainforest/atproto-auth-next';
import { UnauthorizedError, SessionExpiredError } from './server.cjs';
import superjson from 'superjson';
import 'effect/Cause';
import 'effect/Types';
import '@atproto/api';
import '@gainforest/atproto-auth-next/server';

interface TRPCContext {
    agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>;
}
/**
 * Creates a context factory for tRPC.
 * Pass your auth setup from createAuthSetup().
 */
declare function createContextFactory(auth: AuthSetup): () => Promise<TRPCContext>;

declare const appRouter: _trpc_server.TRPCBuiltRouter<{
    ctx: TRPCContext;
    meta: object;
    errorShape: {
        data: {
            effectTag: string | undefined;
            causeMessage: string | undefined;
            code: _trpc_server.TRPC_ERROR_CODE_KEY;
            httpStatus: number;
            path?: string;
            stack?: string;
        };
        message: string;
        code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
    };
    transformer: true;
}, _trpc_server.TRPCDecorateCreateRouterOptions<{
    organization: _trpc_server.TRPCBuiltRouter<{
        ctx: TRPCContext;
        meta: object;
        errorShape: {
            data: {
                effectTag: string | undefined;
                causeMessage: string | undefined;
                code: _trpc_server.TRPC_ERROR_CODE_KEY;
                httpStatus: number;
                path?: string;
                stack?: string;
            };
            message: string;
            code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
        };
        transformer: true;
    }, _trpc_server.TRPCDecorateCreateRouterOptions<{
        info: _trpc_server.TRPCBuiltRouter<{
            ctx: TRPCContext;
            meta: object;
            errorShape: {
                data: {
                    effectTag: string | undefined;
                    causeMessage: string | undefined;
                    code: _trpc_server.TRPC_ERROR_CODE_KEY;
                    httpStatus: number;
                    path?: string;
                    stack?: string;
                };
                message: string;
                code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
            };
            transformer: true;
        }, _trpc_server.TRPCDecorateCreateRouterOptions<{
            create: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.OrganizationInfoMutationResult;
                meta: object;
            }>;
            update: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.OrganizationInfoMutationResult;
                meta: object;
            }>;
            upsert: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.OrganizationInfoMutationResult & {
                    created: boolean;
                };
                meta: object;
            }>;
        }>>;
        defaultSite: _trpc_server.TRPCBuiltRouter<{
            ctx: TRPCContext;
            meta: object;
            errorShape: {
                data: {
                    effectTag: string | undefined;
                    causeMessage: string | undefined;
                    code: _trpc_server.TRPC_ERROR_CODE_KEY;
                    httpStatus: number;
                    path?: string;
                    stack?: string;
                };
                message: string;
                code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
            };
            transformer: true;
        }, _trpc_server.TRPCDecorateCreateRouterOptions<{
            set: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.DefaultSiteMutationResult;
                meta: object;
            }>;
        }>>;
        layer: _trpc_server.TRPCBuiltRouter<{
            ctx: TRPCContext;
            meta: object;
            errorShape: {
                data: {
                    effectTag: string | undefined;
                    causeMessage: string | undefined;
                    code: _trpc_server.TRPC_ERROR_CODE_KEY;
                    httpStatus: number;
                    path?: string;
                    stack?: string;
                };
                message: string;
                code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
            };
            transformer: true;
        }, _trpc_server.TRPCDecorateCreateRouterOptions<{
            create: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.LayerMutationResult;
                meta: object;
            }>;
            update: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.LayerMutationResult;
                meta: object;
            }>;
            upsert: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.LayerMutationResult & {
                    created: boolean;
                };
                meta: object;
            }>;
            delete: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.DeleteRecordResult;
                meta: object;
            }>;
        }>>;
        recordings: _trpc_server.TRPCBuiltRouter<{
            ctx: TRPCContext;
            meta: object;
            errorShape: {
                data: {
                    effectTag: string | undefined;
                    causeMessage: string | undefined;
                    code: _trpc_server.TRPC_ERROR_CODE_KEY;
                    httpStatus: number;
                    path?: string;
                    stack?: string;
                };
                message: string;
                code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
            };
            transformer: true;
        }, _trpc_server.TRPCDecorateCreateRouterOptions<{
            audio: _trpc_server.TRPCBuiltRouter<{
                ctx: TRPCContext;
                meta: object;
                errorShape: {
                    data: {
                        effectTag: string | undefined;
                        causeMessage: string | undefined;
                        code: _trpc_server.TRPC_ERROR_CODE_KEY;
                        httpStatus: number;
                        path?: string;
                        stack?: string;
                    };
                    message: string;
                    code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
                };
                transformer: true;
            }, _trpc_server.TRPCDecorateCreateRouterOptions<{
                create: _trpc_server.TRPCMutationProcedure<{
                    input: any;
                    output: _gainforest_atproto_mutations_core.AudioRecordingMutationResult;
                    meta: object;
                }>;
                update: _trpc_server.TRPCMutationProcedure<{
                    input: any;
                    output: _gainforest_atproto_mutations_core.AudioRecordingMutationResult;
                    meta: object;
                }>;
                upsert: _trpc_server.TRPCMutationProcedure<{
                    input: any;
                    output: _gainforest_atproto_mutations_core.AudioRecordingMutationResult & {
                        created: boolean;
                    };
                    meta: object;
                }>;
                delete: _trpc_server.TRPCMutationProcedure<{
                    input: any;
                    output: _gainforest_atproto_mutations_core.DeleteRecordResult;
                    meta: object;
                }>;
            }>>;
        }>>;
    }>>;
    claim: _trpc_server.TRPCBuiltRouter<{
        ctx: TRPCContext;
        meta: object;
        errorShape: {
            data: {
                effectTag: string | undefined;
                causeMessage: string | undefined;
                code: _trpc_server.TRPC_ERROR_CODE_KEY;
                httpStatus: number;
                path?: string;
                stack?: string;
            };
            message: string;
            code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
        };
        transformer: true;
    }, _trpc_server.TRPCDecorateCreateRouterOptions<{
        activity: _trpc_server.TRPCBuiltRouter<{
            ctx: TRPCContext;
            meta: object;
            errorShape: {
                data: {
                    effectTag: string | undefined;
                    causeMessage: string | undefined;
                    code: _trpc_server.TRPC_ERROR_CODE_KEY;
                    httpStatus: number;
                    path?: string;
                    stack?: string;
                };
                message: string;
                code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
            };
            transformer: true;
        }, _trpc_server.TRPCDecorateCreateRouterOptions<{
            create: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.ClaimActivityMutationResult;
                meta: object;
            }>;
            update: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.ClaimActivityMutationResult;
                meta: object;
            }>;
            upsert: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.ClaimActivityMutationResult & {
                    created: boolean;
                };
                meta: object;
            }>;
            delete: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.DeleteRecordResult;
                meta: object;
            }>;
        }>>;
    }>>;
    certified: _trpc_server.TRPCBuiltRouter<{
        ctx: TRPCContext;
        meta: object;
        errorShape: {
            data: {
                effectTag: string | undefined;
                causeMessage: string | undefined;
                code: _trpc_server.TRPC_ERROR_CODE_KEY;
                httpStatus: number;
                path?: string;
                stack?: string;
            };
            message: string;
            code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
        };
        transformer: true;
    }, _trpc_server.TRPCDecorateCreateRouterOptions<{
        location: _trpc_server.TRPCBuiltRouter<{
            ctx: TRPCContext;
            meta: object;
            errorShape: {
                data: {
                    effectTag: string | undefined;
                    causeMessage: string | undefined;
                    code: _trpc_server.TRPC_ERROR_CODE_KEY;
                    httpStatus: number;
                    path?: string;
                    stack?: string;
                };
                message: string;
                code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
            };
            transformer: true;
        }, _trpc_server.TRPCDecorateCreateRouterOptions<{
            create: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.CertifiedLocationMutationResult;
                meta: object;
            }>;
            update: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.CertifiedLocationMutationResult;
                meta: object;
            }>;
            upsert: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.CertifiedLocationMutationResult & {
                    created: boolean;
                };
                meta: object;
            }>;
            delete: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.DeleteRecordResult;
                meta: object;
            }>;
        }>>;
    }>>;
    funding: _trpc_server.TRPCBuiltRouter<{
        ctx: TRPCContext;
        meta: object;
        errorShape: {
            data: {
                effectTag: string | undefined;
                causeMessage: string | undefined;
                code: _trpc_server.TRPC_ERROR_CODE_KEY;
                httpStatus: number;
                path?: string;
                stack?: string;
            };
            message: string;
            code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
        };
        transformer: true;
    }, _trpc_server.TRPCDecorateCreateRouterOptions<{
        config: _trpc_server.TRPCBuiltRouter<{
            ctx: TRPCContext;
            meta: object;
            errorShape: {
                data: {
                    effectTag: string | undefined;
                    causeMessage: string | undefined;
                    code: _trpc_server.TRPC_ERROR_CODE_KEY;
                    httpStatus: number;
                    path?: string;
                    stack?: string;
                };
                message: string;
                code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
            };
            transformer: true;
        }, _trpc_server.TRPCDecorateCreateRouterOptions<{
            create: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.FundingConfigMutationResult;
                meta: object;
            }>;
            update: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.FundingConfigMutationResult;
                meta: object;
            }>;
            upsert: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.FundingConfigMutationResult & {
                    created: boolean;
                };
                meta: object;
            }>;
            delete: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.DeleteRecordResult;
                meta: object;
            }>;
        }>>;
        receipt: _trpc_server.TRPCBuiltRouter<{
            ctx: TRPCContext;
            meta: object;
            errorShape: {
                data: {
                    effectTag: string | undefined;
                    causeMessage: string | undefined;
                    code: _trpc_server.TRPC_ERROR_CODE_KEY;
                    httpStatus: number;
                    path?: string;
                    stack?: string;
                };
                message: string;
                code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
            };
            transformer: true;
        }, _trpc_server.TRPCDecorateCreateRouterOptions<{
            create: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.FundingReceiptMutationResult;
                meta: object;
            }>;
        }>>;
    }>>;
    link: _trpc_server.TRPCBuiltRouter<{
        ctx: TRPCContext;
        meta: object;
        errorShape: {
            data: {
                effectTag: string | undefined;
                causeMessage: string | undefined;
                code: _trpc_server.TRPC_ERROR_CODE_KEY;
                httpStatus: number;
                path?: string;
                stack?: string;
            };
            message: string;
            code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
        };
        transformer: true;
    }, _trpc_server.TRPCDecorateCreateRouterOptions<{
        evm: _trpc_server.TRPCBuiltRouter<{
            ctx: TRPCContext;
            meta: object;
            errorShape: {
                data: {
                    effectTag: string | undefined;
                    causeMessage: string | undefined;
                    code: _trpc_server.TRPC_ERROR_CODE_KEY;
                    httpStatus: number;
                    path?: string;
                    stack?: string;
                };
                message: string;
                code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
            };
            transformer: true;
        }, _trpc_server.TRPCDecorateCreateRouterOptions<{
            create: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.LinkEvmMutationResult;
                meta: object;
            }>;
            update: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.LinkEvmMutationResult;
                meta: object;
            }>;
            delete: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.DeleteRecordResult;
                meta: object;
            }>;
        }>>;
    }>>;
    dwc: _trpc_server.TRPCBuiltRouter<{
        ctx: TRPCContext;
        meta: object;
        errorShape: {
            data: {
                effectTag: string | undefined;
                causeMessage: string | undefined;
                code: _trpc_server.TRPC_ERROR_CODE_KEY;
                httpStatus: number;
                path?: string;
                stack?: string;
            };
            message: string;
            code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
        };
        transformer: true;
    }, _trpc_server.TRPCDecorateCreateRouterOptions<{
        occurrence: _trpc_server.TRPCBuiltRouter<{
            ctx: TRPCContext;
            meta: object;
            errorShape: {
                data: {
                    effectTag: string | undefined;
                    causeMessage: string | undefined;
                    code: _trpc_server.TRPC_ERROR_CODE_KEY;
                    httpStatus: number;
                    path?: string;
                    stack?: string;
                };
                message: string;
                code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
            };
            transformer: true;
        }, _trpc_server.TRPCDecorateCreateRouterOptions<{
            create: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.DwcOccurrenceMutationResult;
                meta: object;
            }>;
        }>>;
        measurement: _trpc_server.TRPCBuiltRouter<{
            ctx: TRPCContext;
            meta: object;
            errorShape: {
                data: {
                    effectTag: string | undefined;
                    causeMessage: string | undefined;
                    code: _trpc_server.TRPC_ERROR_CODE_KEY;
                    httpStatus: number;
                    path?: string;
                    stack?: string;
                };
                message: string;
                code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
            };
            transformer: true;
        }, _trpc_server.TRPCDecorateCreateRouterOptions<{
            create: _trpc_server.TRPCMutationProcedure<{
                input: any;
                output: _gainforest_atproto_mutations_core.DwcMeasurementMutationResult;
                meta: object;
            }>;
        }>>;
    }>>;
    blob: _trpc_server.TRPCBuiltRouter<{
        ctx: TRPCContext;
        meta: object;
        errorShape: {
            data: {
                effectTag: string | undefined;
                causeMessage: string | undefined;
                code: _trpc_server.TRPC_ERROR_CODE_KEY;
                httpStatus: number;
                path?: string;
                stack?: string;
            };
            message: string;
            code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
        };
        transformer: true;
    }, _trpc_server.TRPCDecorateCreateRouterOptions<{
        upload: _trpc_server.TRPCMutationProcedure<{
            input: any;
            output: _gainforest_atproto_mutations_core.UploadBlobResult;
            meta: object;
        }>;
    }>>;
}>>;
type AppRouter = typeof appRouter;

type ServerCaller = ReturnType<AppRouter["createCaller"]>;
/**
 * Creates a cached server caller for use in React Server Components.
 *
 * The caller is cached per-request via React's `cache()`, so it's safe to
 * call `getServerCaller()` multiple times in the same render pass without
 * rebuilding the context or making extra PDS calls.
 *
 * @example
 * // lib/trpc/server.ts
 * import { createServerCaller } from "@gainforest/atproto-mutations-next/trpc";
 * import { auth } from "@/lib/auth";
 *
 * export const getServerCaller = createServerCaller(auth);
 *
 * // In a Server Component
 * const caller = await getServerCaller();
 * const data = await caller.claim.activity.create({ ... });
 */
declare function createServerCaller(auth: AuthSetup): () => Promise<ServerCaller>;

/**
 * Maps Effect tagged errors to TRPCError.
 * Preserves original error in cause for debugging.
 */
declare function mapEffectErrorToTRPC(error: unknown): TRPCError;

/**
 * Wraps an Effect mutation as a tRPC procedure.
 *
 * - Runs Effect.runPromise with the agent layer from context
 * - Maps Effect errors to TRPCError
 * - Input passes through as-is (Effect validates internally via $parse)
 *
 * The `O` type parameter preserves the output type so tRPC clients get
 * proper return type inference. Input is typed as `any` at the boundary
 * because Effect validates it internally.
 */
declare function effectMutation<O>(mutation: (input: any) => Effect.Effect<O, any, AtprotoAgent>): _trpc_server.TRPCMutationProcedure<{
    input: any;
    output: O;
    meta: object;
}>;

declare const t: _trpc_server.TRPCRootObject<TRPCContext, object, {
    transformer: typeof superjson;
    errorFormatter({ shape, error }: {
        error: _trpc_server.TRPCError;
        type: _trpc_server.ProcedureType | "unknown";
        path: string | undefined;
        input: unknown;
        ctx: TRPCContext | undefined;
        shape: _trpc_server.TRPCDefaultErrorShape;
    }): {
        data: {
            effectTag: string | undefined;
            causeMessage: string | undefined;
            code: _trpc_server.TRPC_ERROR_CODE_KEY;
            httpStatus: number;
            path?: string;
            stack?: string;
        };
        message: string;
        code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
    };
}, {
    ctx: TRPCContext;
    meta: object;
    errorShape: {
        data: {
            effectTag: string | undefined;
            causeMessage: string | undefined;
            code: _trpc_server.TRPC_ERROR_CODE_KEY;
            httpStatus: number;
            path?: string;
            stack?: string;
        };
        message: string;
        code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
    };
    transformer: true;
}>;
declare const router: _trpc_server.TRPCRouterBuilder<{
    ctx: TRPCContext;
    meta: object;
    errorShape: {
        data: {
            effectTag: string | undefined;
            causeMessage: string | undefined;
            code: _trpc_server.TRPC_ERROR_CODE_KEY;
            httpStatus: number;
            path?: string;
            stack?: string;
        };
        message: string;
        code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
    };
    transformer: true;
}>;
declare const publicProcedure: _trpc_server.TRPCProcedureBuilder<TRPCContext, object, object, _trpc_server.TRPCUnsetMarker, _trpc_server.TRPCUnsetMarker, _trpc_server.TRPCUnsetMarker, _trpc_server.TRPCUnsetMarker, false>;
declare const middleware: <$ContextOverrides>(fn: _trpc_server.TRPCMiddlewareFunction<TRPCContext, object, object, $ContextOverrides, unknown>) => _trpc_server.TRPCMiddlewareBuilder<TRPCContext, object, $ContextOverrides, unknown>;

type AnyMutationFn = (input: any) => Effect.Effect<any, any, AtprotoAgent>;
/**
 * Creates a tRPC router from an entity with standard CRUD operations.
 * Generates procedures for whichever of create / update / upsert / delete are present.
 *
 * Overloads preserve the concrete output type of each procedure so the tRPC
 * React client sees the correct return type (e.g. ClaimActivityMutationResult).
 *
 * @example
 * // In router.ts:
 * certified: router({
 *   location: entityRouter(mutations.certified.location),
 * }),
 */
declare function entityRouter<Create extends AnyMutationFn, Update extends AnyMutationFn, Upsert extends AnyMutationFn, Del extends AnyMutationFn>(entity: {
    create: Create;
    update: Update;
    upsert: Upsert;
    delete: Del;
}): ReturnType<typeof router<{
    create: ReturnType<typeof effectMutation<EffectSuccess<ReturnType<Create>>>>;
    update: ReturnType<typeof effectMutation<EffectSuccess<ReturnType<Update>>>>;
    upsert: ReturnType<typeof effectMutation<EffectSuccess<ReturnType<Upsert>>>>;
    delete: ReturnType<typeof effectMutation<EffectSuccess<ReturnType<Del>>>>;
}>>;
declare function entityRouter<Create extends AnyMutationFn, Update extends AnyMutationFn, Upsert extends AnyMutationFn>(entity: {
    create: Create;
    update: Update;
    upsert: Upsert;
    delete?: undefined;
}): ReturnType<typeof router<{
    create: ReturnType<typeof effectMutation<EffectSuccess<ReturnType<Create>>>>;
    update: ReturnType<typeof effectMutation<EffectSuccess<ReturnType<Update>>>>;
    upsert: ReturnType<typeof effectMutation<EffectSuccess<ReturnType<Upsert>>>>;
}>>;

export { type AppRouter, type TRPCContext, appRouter, createContextFactory, createServerCaller, effectMutation, entityRouter, mapEffectErrorToTRPC, middleware, publicProcedure, router, t };
