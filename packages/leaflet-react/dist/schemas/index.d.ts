import { z } from 'zod';
import { n as LeafletListItem } from '../index-BA1P_5HV.js';

/**
 * Zod schemas for Leaflet lexicon types.
 *
 * These mirror the TypeScript interfaces in `../types/index.ts` and can be used
 * for runtime validation at API/form boundaries.
 *
 * Requires `zod` as a peer dependency.
 */

declare const LeafletByteSliceSchema: z.ZodObject<{
    byteStart: z.ZodNumber;
    byteEnd: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    byteStart: number;
    byteEnd: number;
}, {
    byteStart: number;
    byteEnd: number;
}>;
declare const LeafletFacetFeatureSchema: z.ZodDiscriminatedUnion<"$type", [z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#bold">;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.richtext.facet#bold";
}, {
    $type: "pub.leaflet.richtext.facet#bold";
}>, z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#italic">;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.richtext.facet#italic";
}, {
    $type: "pub.leaflet.richtext.facet#italic";
}>, z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#code">;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.richtext.facet#code";
}, {
    $type: "pub.leaflet.richtext.facet#code";
}>, z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#strikethrough">;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.richtext.facet#strikethrough";
}, {
    $type: "pub.leaflet.richtext.facet#strikethrough";
}>, z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#underline">;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.richtext.facet#underline";
}, {
    $type: "pub.leaflet.richtext.facet#underline";
}>, z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#highlight">;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.richtext.facet#highlight";
}, {
    $type: "pub.leaflet.richtext.facet#highlight";
}>, z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#link">;
    uri: z.ZodString;
}, "strip", z.ZodTypeAny, {
    uri: string;
    $type: "pub.leaflet.richtext.facet#link";
}, {
    uri: string;
    $type: "pub.leaflet.richtext.facet#link";
}>, z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#didMention">;
    did: z.ZodString;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.richtext.facet#didMention";
    did: string;
}, {
    $type: "pub.leaflet.richtext.facet#didMention";
    did: string;
}>, z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#atMention">;
    atURI: z.ZodString;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.richtext.facet#atMention";
    atURI: string;
}, {
    $type: "pub.leaflet.richtext.facet#atMention";
    atURI: string;
}>, z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#id">;
    id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.richtext.facet#id";
    id?: string | undefined;
}, {
    $type: "pub.leaflet.richtext.facet#id";
    id?: string | undefined;
}>]>;
declare const LeafletFacetSchema: z.ZodObject<{
    index: z.ZodObject<{
        byteStart: z.ZodNumber;
        byteEnd: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        byteStart: number;
        byteEnd: number;
    }, {
        byteStart: number;
        byteEnd: number;
    }>;
    features: z.ZodArray<z.ZodDiscriminatedUnion<"$type", [z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.richtext.facet#bold">;
    }, "strip", z.ZodTypeAny, {
        $type: "pub.leaflet.richtext.facet#bold";
    }, {
        $type: "pub.leaflet.richtext.facet#bold";
    }>, z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.richtext.facet#italic">;
    }, "strip", z.ZodTypeAny, {
        $type: "pub.leaflet.richtext.facet#italic";
    }, {
        $type: "pub.leaflet.richtext.facet#italic";
    }>, z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.richtext.facet#code">;
    }, "strip", z.ZodTypeAny, {
        $type: "pub.leaflet.richtext.facet#code";
    }, {
        $type: "pub.leaflet.richtext.facet#code";
    }>, z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.richtext.facet#strikethrough">;
    }, "strip", z.ZodTypeAny, {
        $type: "pub.leaflet.richtext.facet#strikethrough";
    }, {
        $type: "pub.leaflet.richtext.facet#strikethrough";
    }>, z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.richtext.facet#underline">;
    }, "strip", z.ZodTypeAny, {
        $type: "pub.leaflet.richtext.facet#underline";
    }, {
        $type: "pub.leaflet.richtext.facet#underline";
    }>, z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.richtext.facet#highlight">;
    }, "strip", z.ZodTypeAny, {
        $type: "pub.leaflet.richtext.facet#highlight";
    }, {
        $type: "pub.leaflet.richtext.facet#highlight";
    }>, z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.richtext.facet#link">;
        uri: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        $type: "pub.leaflet.richtext.facet#link";
    }, {
        uri: string;
        $type: "pub.leaflet.richtext.facet#link";
    }>, z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.richtext.facet#didMention">;
        did: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        $type: "pub.leaflet.richtext.facet#didMention";
        did: string;
    }, {
        $type: "pub.leaflet.richtext.facet#didMention";
        did: string;
    }>, z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.richtext.facet#atMention">;
        atURI: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        $type: "pub.leaflet.richtext.facet#atMention";
        atURI: string;
    }, {
        $type: "pub.leaflet.richtext.facet#atMention";
        atURI: string;
    }>, z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.richtext.facet#id">;
        id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        $type: "pub.leaflet.richtext.facet#id";
        id?: string | undefined;
    }, {
        $type: "pub.leaflet.richtext.facet#id";
        id?: string | undefined;
    }>]>, "many">;
}, "strip", z.ZodTypeAny, {
    index: {
        byteStart: number;
        byteEnd: number;
    };
    features: ({
        $type: "pub.leaflet.richtext.facet#bold";
    } | {
        $type: "pub.leaflet.richtext.facet#italic";
    } | {
        $type: "pub.leaflet.richtext.facet#code";
    } | {
        $type: "pub.leaflet.richtext.facet#strikethrough";
    } | {
        $type: "pub.leaflet.richtext.facet#underline";
    } | {
        $type: "pub.leaflet.richtext.facet#highlight";
    } | {
        uri: string;
        $type: "pub.leaflet.richtext.facet#link";
    } | {
        $type: "pub.leaflet.richtext.facet#didMention";
        did: string;
    } | {
        $type: "pub.leaflet.richtext.facet#atMention";
        atURI: string;
    } | {
        $type: "pub.leaflet.richtext.facet#id";
        id?: string | undefined;
    })[];
}, {
    index: {
        byteStart: number;
        byteEnd: number;
    };
    features: ({
        $type: "pub.leaflet.richtext.facet#bold";
    } | {
        $type: "pub.leaflet.richtext.facet#italic";
    } | {
        $type: "pub.leaflet.richtext.facet#code";
    } | {
        $type: "pub.leaflet.richtext.facet#strikethrough";
    } | {
        $type: "pub.leaflet.richtext.facet#underline";
    } | {
        $type: "pub.leaflet.richtext.facet#highlight";
    } | {
        uri: string;
        $type: "pub.leaflet.richtext.facet#link";
    } | {
        $type: "pub.leaflet.richtext.facet#didMention";
        did: string;
    } | {
        $type: "pub.leaflet.richtext.facet#atMention";
        atURI: string;
    } | {
        $type: "pub.leaflet.richtext.facet#id";
        id?: string | undefined;
    })[];
}>;
declare const LeafletBlobRefSchema: z.ZodObject<{
    $type: z.ZodLiteral<"blob">;
    ref: z.ZodObject<{
        $link: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        $link: string;
    }, {
        $link: string;
    }>;
    mimeType: z.ZodString;
    size: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    ref: {
        $link: string;
    };
    $type: "blob";
    mimeType: string;
    size: number;
}, {
    ref: {
        $link: string;
    };
    $type: "blob";
    mimeType: string;
    size: number;
}>;
declare const LeafletTextBlockSchema: z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.blocks.text">;
    plaintext: z.ZodString;
    facets: z.ZodOptional<z.ZodArray<z.ZodObject<{
        index: z.ZodObject<{
            byteStart: z.ZodNumber;
            byteEnd: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            byteStart: number;
            byteEnd: number;
        }, {
            byteStart: number;
            byteEnd: number;
        }>;
        features: z.ZodArray<z.ZodDiscriminatedUnion<"$type", [z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#bold">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#bold";
        }, {
            $type: "pub.leaflet.richtext.facet#bold";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#italic">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#italic";
        }, {
            $type: "pub.leaflet.richtext.facet#italic";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#code">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#code";
        }, {
            $type: "pub.leaflet.richtext.facet#code";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#strikethrough">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        }, {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#underline">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#underline";
        }, {
            $type: "pub.leaflet.richtext.facet#underline";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#highlight">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#highlight";
        }, {
            $type: "pub.leaflet.richtext.facet#highlight";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#link">;
            uri: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        }, {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#didMention">;
            did: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        }, {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#atMention">;
            atURI: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        }, {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#id">;
            id: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        }, {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        }>]>, "many">;
    }, "strip", z.ZodTypeAny, {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }, {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }>, "many">>;
    textSize: z.ZodOptional<z.ZodEnum<["default", "small", "large"]>>;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.blocks.text";
    plaintext: string;
    facets?: {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }[] | undefined;
    textSize?: "default" | "small" | "large" | undefined;
}, {
    $type: "pub.leaflet.blocks.text";
    plaintext: string;
    facets?: {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }[] | undefined;
    textSize?: "default" | "small" | "large" | undefined;
}>;
declare const LeafletHeaderBlockSchema: z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.blocks.header">;
    plaintext: z.ZodString;
    facets: z.ZodOptional<z.ZodArray<z.ZodObject<{
        index: z.ZodObject<{
            byteStart: z.ZodNumber;
            byteEnd: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            byteStart: number;
            byteEnd: number;
        }, {
            byteStart: number;
            byteEnd: number;
        }>;
        features: z.ZodArray<z.ZodDiscriminatedUnion<"$type", [z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#bold">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#bold";
        }, {
            $type: "pub.leaflet.richtext.facet#bold";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#italic">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#italic";
        }, {
            $type: "pub.leaflet.richtext.facet#italic";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#code">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#code";
        }, {
            $type: "pub.leaflet.richtext.facet#code";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#strikethrough">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        }, {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#underline">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#underline";
        }, {
            $type: "pub.leaflet.richtext.facet#underline";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#highlight">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#highlight";
        }, {
            $type: "pub.leaflet.richtext.facet#highlight";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#link">;
            uri: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        }, {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#didMention">;
            did: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        }, {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#atMention">;
            atURI: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        }, {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#id">;
            id: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        }, {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        }>]>, "many">;
    }, "strip", z.ZodTypeAny, {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }, {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }>, "many">>;
    level: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.blocks.header";
    plaintext: string;
    facets?: {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }[] | undefined;
    level?: number | undefined;
}, {
    $type: "pub.leaflet.blocks.header";
    plaintext: string;
    facets?: {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }[] | undefined;
    level?: number | undefined;
}>;
declare const LeafletImageBlockSchema: z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.blocks.image">;
    image: z.ZodObject<{
        $type: z.ZodLiteral<"blob">;
        ref: z.ZodObject<{
            $link: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            $link: string;
        }, {
            $link: string;
        }>;
        mimeType: z.ZodString;
        size: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        ref: {
            $link: string;
        };
        $type: "blob";
        mimeType: string;
        size: number;
    }, {
        ref: {
            $link: string;
        };
        $type: "blob";
        mimeType: string;
        size: number;
    }>;
    alt: z.ZodOptional<z.ZodString>;
    aspectRatio: z.ZodOptional<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        height: number;
        width: number;
    }, {
        height: number;
        width: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.blocks.image";
    image: {
        ref: {
            $link: string;
        };
        $type: "blob";
        mimeType: string;
        size: number;
    };
    alt?: string | undefined;
    aspectRatio?: {
        height: number;
        width: number;
    } | undefined;
}, {
    $type: "pub.leaflet.blocks.image";
    image: {
        ref: {
            $link: string;
        };
        $type: "blob";
        mimeType: string;
        size: number;
    };
    alt?: string | undefined;
    aspectRatio?: {
        height: number;
        width: number;
    } | undefined;
}>;
declare const LeafletBlockquoteBlockSchema: z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.blocks.blockquote">;
    plaintext: z.ZodString;
    facets: z.ZodOptional<z.ZodArray<z.ZodObject<{
        index: z.ZodObject<{
            byteStart: z.ZodNumber;
            byteEnd: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            byteStart: number;
            byteEnd: number;
        }, {
            byteStart: number;
            byteEnd: number;
        }>;
        features: z.ZodArray<z.ZodDiscriminatedUnion<"$type", [z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#bold">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#bold";
        }, {
            $type: "pub.leaflet.richtext.facet#bold";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#italic">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#italic";
        }, {
            $type: "pub.leaflet.richtext.facet#italic";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#code">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#code";
        }, {
            $type: "pub.leaflet.richtext.facet#code";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#strikethrough">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        }, {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#underline">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#underline";
        }, {
            $type: "pub.leaflet.richtext.facet#underline";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#highlight">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#highlight";
        }, {
            $type: "pub.leaflet.richtext.facet#highlight";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#link">;
            uri: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        }, {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#didMention">;
            did: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        }, {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#atMention">;
            atURI: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        }, {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#id">;
            id: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        }, {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        }>]>, "many">;
    }, "strip", z.ZodTypeAny, {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }, {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.blocks.blockquote";
    plaintext: string;
    facets?: {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }[] | undefined;
}, {
    $type: "pub.leaflet.blocks.blockquote";
    plaintext: string;
    facets?: {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }[] | undefined;
}>;
declare const LeafletCodeBlockSchema: z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.blocks.code">;
    plaintext: z.ZodString;
    language: z.ZodOptional<z.ZodString>;
    syntaxHighlightingTheme: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.blocks.code";
    plaintext: string;
    language?: string | undefined;
    syntaxHighlightingTheme?: string | undefined;
}, {
    $type: "pub.leaflet.blocks.code";
    plaintext: string;
    language?: string | undefined;
    syntaxHighlightingTheme?: string | undefined;
}>;
declare const LeafletHorizontalRuleBlockSchema: z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.blocks.horizontalRule">;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.blocks.horizontalRule";
}, {
    $type: "pub.leaflet.blocks.horizontalRule";
}>;
declare const LeafletIframeBlockSchema: z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.blocks.iframe">;
    url: z.ZodString;
    height: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.blocks.iframe";
    url: string;
    height?: number | undefined;
}, {
    $type: "pub.leaflet.blocks.iframe";
    url: string;
    height?: number | undefined;
}>;
declare const LeafletWebsiteBlockSchema: z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.blocks.website">;
    src: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.blocks.website";
    src: string;
    title?: string | undefined;
    description?: string | undefined;
}, {
    $type: "pub.leaflet.blocks.website";
    src: string;
    title?: string | undefined;
    description?: string | undefined;
}>;

declare const LeafletListItemSchema: z.ZodType<LeafletListItem>;
declare const LeafletUnorderedListBlockSchema: z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.blocks.unorderedList">;
    children: z.ZodArray<z.ZodType<LeafletListItem, z.ZodTypeDef, LeafletListItem>, "many">;
}, "strip", z.ZodTypeAny, {
    children: LeafletListItem[];
    $type: "pub.leaflet.blocks.unorderedList";
}, {
    children: LeafletListItem[];
    $type: "pub.leaflet.blocks.unorderedList";
}>;
declare const LeafletBlockSchema: z.ZodDiscriminatedUnion<"$type", [z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.blocks.text">;
    plaintext: z.ZodString;
    facets: z.ZodOptional<z.ZodArray<z.ZodObject<{
        index: z.ZodObject<{
            byteStart: z.ZodNumber;
            byteEnd: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            byteStart: number;
            byteEnd: number;
        }, {
            byteStart: number;
            byteEnd: number;
        }>;
        features: z.ZodArray<z.ZodDiscriminatedUnion<"$type", [z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#bold">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#bold";
        }, {
            $type: "pub.leaflet.richtext.facet#bold";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#italic">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#italic";
        }, {
            $type: "pub.leaflet.richtext.facet#italic";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#code">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#code";
        }, {
            $type: "pub.leaflet.richtext.facet#code";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#strikethrough">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        }, {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#underline">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#underline";
        }, {
            $type: "pub.leaflet.richtext.facet#underline";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#highlight">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#highlight";
        }, {
            $type: "pub.leaflet.richtext.facet#highlight";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#link">;
            uri: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        }, {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#didMention">;
            did: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        }, {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#atMention">;
            atURI: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        }, {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#id">;
            id: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        }, {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        }>]>, "many">;
    }, "strip", z.ZodTypeAny, {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }, {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }>, "many">>;
    textSize: z.ZodOptional<z.ZodEnum<["default", "small", "large"]>>;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.blocks.text";
    plaintext: string;
    facets?: {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }[] | undefined;
    textSize?: "default" | "small" | "large" | undefined;
}, {
    $type: "pub.leaflet.blocks.text";
    plaintext: string;
    facets?: {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }[] | undefined;
    textSize?: "default" | "small" | "large" | undefined;
}>, z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.blocks.header">;
    plaintext: z.ZodString;
    facets: z.ZodOptional<z.ZodArray<z.ZodObject<{
        index: z.ZodObject<{
            byteStart: z.ZodNumber;
            byteEnd: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            byteStart: number;
            byteEnd: number;
        }, {
            byteStart: number;
            byteEnd: number;
        }>;
        features: z.ZodArray<z.ZodDiscriminatedUnion<"$type", [z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#bold">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#bold";
        }, {
            $type: "pub.leaflet.richtext.facet#bold";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#italic">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#italic";
        }, {
            $type: "pub.leaflet.richtext.facet#italic";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#code">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#code";
        }, {
            $type: "pub.leaflet.richtext.facet#code";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#strikethrough">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        }, {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#underline">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#underline";
        }, {
            $type: "pub.leaflet.richtext.facet#underline";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#highlight">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#highlight";
        }, {
            $type: "pub.leaflet.richtext.facet#highlight";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#link">;
            uri: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        }, {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#didMention">;
            did: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        }, {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#atMention">;
            atURI: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        }, {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#id">;
            id: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        }, {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        }>]>, "many">;
    }, "strip", z.ZodTypeAny, {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }, {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }>, "many">>;
    level: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.blocks.header";
    plaintext: string;
    facets?: {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }[] | undefined;
    level?: number | undefined;
}, {
    $type: "pub.leaflet.blocks.header";
    plaintext: string;
    facets?: {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }[] | undefined;
    level?: number | undefined;
}>, z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.blocks.image">;
    image: z.ZodObject<{
        $type: z.ZodLiteral<"blob">;
        ref: z.ZodObject<{
            $link: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            $link: string;
        }, {
            $link: string;
        }>;
        mimeType: z.ZodString;
        size: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        ref: {
            $link: string;
        };
        $type: "blob";
        mimeType: string;
        size: number;
    }, {
        ref: {
            $link: string;
        };
        $type: "blob";
        mimeType: string;
        size: number;
    }>;
    alt: z.ZodOptional<z.ZodString>;
    aspectRatio: z.ZodOptional<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        height: number;
        width: number;
    }, {
        height: number;
        width: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.blocks.image";
    image: {
        ref: {
            $link: string;
        };
        $type: "blob";
        mimeType: string;
        size: number;
    };
    alt?: string | undefined;
    aspectRatio?: {
        height: number;
        width: number;
    } | undefined;
}, {
    $type: "pub.leaflet.blocks.image";
    image: {
        ref: {
            $link: string;
        };
        $type: "blob";
        mimeType: string;
        size: number;
    };
    alt?: string | undefined;
    aspectRatio?: {
        height: number;
        width: number;
    } | undefined;
}>, z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.blocks.blockquote">;
    plaintext: z.ZodString;
    facets: z.ZodOptional<z.ZodArray<z.ZodObject<{
        index: z.ZodObject<{
            byteStart: z.ZodNumber;
            byteEnd: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            byteStart: number;
            byteEnd: number;
        }, {
            byteStart: number;
            byteEnd: number;
        }>;
        features: z.ZodArray<z.ZodDiscriminatedUnion<"$type", [z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#bold">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#bold";
        }, {
            $type: "pub.leaflet.richtext.facet#bold";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#italic">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#italic";
        }, {
            $type: "pub.leaflet.richtext.facet#italic";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#code">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#code";
        }, {
            $type: "pub.leaflet.richtext.facet#code";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#strikethrough">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        }, {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#underline">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#underline";
        }, {
            $type: "pub.leaflet.richtext.facet#underline";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#highlight">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#highlight";
        }, {
            $type: "pub.leaflet.richtext.facet#highlight";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#link">;
            uri: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        }, {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#didMention">;
            did: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        }, {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#atMention">;
            atURI: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        }, {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.richtext.facet#id">;
            id: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        }, {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        }>]>, "many">;
    }, "strip", z.ZodTypeAny, {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }, {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.blocks.blockquote";
    plaintext: string;
    facets?: {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }[] | undefined;
}, {
    $type: "pub.leaflet.blocks.blockquote";
    plaintext: string;
    facets?: {
        index: {
            byteStart: number;
            byteEnd: number;
        };
        features: ({
            $type: "pub.leaflet.richtext.facet#bold";
        } | {
            $type: "pub.leaflet.richtext.facet#italic";
        } | {
            $type: "pub.leaflet.richtext.facet#code";
        } | {
            $type: "pub.leaflet.richtext.facet#strikethrough";
        } | {
            $type: "pub.leaflet.richtext.facet#underline";
        } | {
            $type: "pub.leaflet.richtext.facet#highlight";
        } | {
            uri: string;
            $type: "pub.leaflet.richtext.facet#link";
        } | {
            $type: "pub.leaflet.richtext.facet#didMention";
            did: string;
        } | {
            $type: "pub.leaflet.richtext.facet#atMention";
            atURI: string;
        } | {
            $type: "pub.leaflet.richtext.facet#id";
            id?: string | undefined;
        })[];
    }[] | undefined;
}>, z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.blocks.unorderedList">;
    children: z.ZodArray<z.ZodType<LeafletListItem, z.ZodTypeDef, LeafletListItem>, "many">;
}, "strip", z.ZodTypeAny, {
    children: LeafletListItem[];
    $type: "pub.leaflet.blocks.unorderedList";
}, {
    children: LeafletListItem[];
    $type: "pub.leaflet.blocks.unorderedList";
}>, z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.blocks.code">;
    plaintext: z.ZodString;
    language: z.ZodOptional<z.ZodString>;
    syntaxHighlightingTheme: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.blocks.code";
    plaintext: string;
    language?: string | undefined;
    syntaxHighlightingTheme?: string | undefined;
}, {
    $type: "pub.leaflet.blocks.code";
    plaintext: string;
    language?: string | undefined;
    syntaxHighlightingTheme?: string | undefined;
}>, z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.blocks.horizontalRule">;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.blocks.horizontalRule";
}, {
    $type: "pub.leaflet.blocks.horizontalRule";
}>, z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.blocks.iframe">;
    url: z.ZodString;
    height: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.blocks.iframe";
    url: string;
    height?: number | undefined;
}, {
    $type: "pub.leaflet.blocks.iframe";
    url: string;
    height?: number | undefined;
}>, z.ZodObject<{
    $type: z.ZodLiteral<"pub.leaflet.blocks.website">;
    src: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    $type: "pub.leaflet.blocks.website";
    src: string;
    title?: string | undefined;
    description?: string | undefined;
}, {
    $type: "pub.leaflet.blocks.website";
    src: string;
    title?: string | undefined;
    description?: string | undefined;
}>]>;
declare const LeafletBlockAlignmentSchema: z.ZodEnum<["pub.leaflet.pages.linearDocument#textAlignLeft", "pub.leaflet.pages.linearDocument#textAlignCenter", "pub.leaflet.pages.linearDocument#textAlignRight", "pub.leaflet.pages.linearDocument#textAlignJustify"]>;
declare const LeafletBlockWrapperSchema: z.ZodObject<{
    $type: z.ZodOptional<z.ZodLiteral<"pub.leaflet.pages.linearDocument#block">>;
    block: z.ZodDiscriminatedUnion<"$type", [z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.blocks.text">;
        plaintext: z.ZodString;
        facets: z.ZodOptional<z.ZodArray<z.ZodObject<{
            index: z.ZodObject<{
                byteStart: z.ZodNumber;
                byteEnd: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                byteStart: number;
                byteEnd: number;
            }, {
                byteStart: number;
                byteEnd: number;
            }>;
            features: z.ZodArray<z.ZodDiscriminatedUnion<"$type", [z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#bold">;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#bold";
            }, {
                $type: "pub.leaflet.richtext.facet#bold";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#italic">;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#italic";
            }, {
                $type: "pub.leaflet.richtext.facet#italic";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#code">;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#code";
            }, {
                $type: "pub.leaflet.richtext.facet#code";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#strikethrough">;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            }, {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#underline">;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#underline";
            }, {
                $type: "pub.leaflet.richtext.facet#underline";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#highlight">;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#highlight";
            }, {
                $type: "pub.leaflet.richtext.facet#highlight";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#link">;
                uri: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            }, {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#didMention">;
                did: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            }, {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#atMention">;
                atURI: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            }, {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#id">;
                id: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            }, {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            }>]>, "many">;
        }, "strip", z.ZodTypeAny, {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: ({
                $type: "pub.leaflet.richtext.facet#bold";
            } | {
                $type: "pub.leaflet.richtext.facet#italic";
            } | {
                $type: "pub.leaflet.richtext.facet#code";
            } | {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            } | {
                $type: "pub.leaflet.richtext.facet#underline";
            } | {
                $type: "pub.leaflet.richtext.facet#highlight";
            } | {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            } | {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            } | {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            } | {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            })[];
        }, {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: ({
                $type: "pub.leaflet.richtext.facet#bold";
            } | {
                $type: "pub.leaflet.richtext.facet#italic";
            } | {
                $type: "pub.leaflet.richtext.facet#code";
            } | {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            } | {
                $type: "pub.leaflet.richtext.facet#underline";
            } | {
                $type: "pub.leaflet.richtext.facet#highlight";
            } | {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            } | {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            } | {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            } | {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            })[];
        }>, "many">>;
        textSize: z.ZodOptional<z.ZodEnum<["default", "small", "large"]>>;
    }, "strip", z.ZodTypeAny, {
        $type: "pub.leaflet.blocks.text";
        plaintext: string;
        facets?: {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: ({
                $type: "pub.leaflet.richtext.facet#bold";
            } | {
                $type: "pub.leaflet.richtext.facet#italic";
            } | {
                $type: "pub.leaflet.richtext.facet#code";
            } | {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            } | {
                $type: "pub.leaflet.richtext.facet#underline";
            } | {
                $type: "pub.leaflet.richtext.facet#highlight";
            } | {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            } | {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            } | {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            } | {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            })[];
        }[] | undefined;
        textSize?: "default" | "small" | "large" | undefined;
    }, {
        $type: "pub.leaflet.blocks.text";
        plaintext: string;
        facets?: {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: ({
                $type: "pub.leaflet.richtext.facet#bold";
            } | {
                $type: "pub.leaflet.richtext.facet#italic";
            } | {
                $type: "pub.leaflet.richtext.facet#code";
            } | {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            } | {
                $type: "pub.leaflet.richtext.facet#underline";
            } | {
                $type: "pub.leaflet.richtext.facet#highlight";
            } | {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            } | {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            } | {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            } | {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            })[];
        }[] | undefined;
        textSize?: "default" | "small" | "large" | undefined;
    }>, z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.blocks.header">;
        plaintext: z.ZodString;
        facets: z.ZodOptional<z.ZodArray<z.ZodObject<{
            index: z.ZodObject<{
                byteStart: z.ZodNumber;
                byteEnd: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                byteStart: number;
                byteEnd: number;
            }, {
                byteStart: number;
                byteEnd: number;
            }>;
            features: z.ZodArray<z.ZodDiscriminatedUnion<"$type", [z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#bold">;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#bold";
            }, {
                $type: "pub.leaflet.richtext.facet#bold";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#italic">;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#italic";
            }, {
                $type: "pub.leaflet.richtext.facet#italic";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#code">;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#code";
            }, {
                $type: "pub.leaflet.richtext.facet#code";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#strikethrough">;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            }, {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#underline">;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#underline";
            }, {
                $type: "pub.leaflet.richtext.facet#underline";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#highlight">;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#highlight";
            }, {
                $type: "pub.leaflet.richtext.facet#highlight";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#link">;
                uri: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            }, {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#didMention">;
                did: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            }, {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#atMention">;
                atURI: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            }, {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#id">;
                id: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            }, {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            }>]>, "many">;
        }, "strip", z.ZodTypeAny, {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: ({
                $type: "pub.leaflet.richtext.facet#bold";
            } | {
                $type: "pub.leaflet.richtext.facet#italic";
            } | {
                $type: "pub.leaflet.richtext.facet#code";
            } | {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            } | {
                $type: "pub.leaflet.richtext.facet#underline";
            } | {
                $type: "pub.leaflet.richtext.facet#highlight";
            } | {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            } | {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            } | {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            } | {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            })[];
        }, {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: ({
                $type: "pub.leaflet.richtext.facet#bold";
            } | {
                $type: "pub.leaflet.richtext.facet#italic";
            } | {
                $type: "pub.leaflet.richtext.facet#code";
            } | {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            } | {
                $type: "pub.leaflet.richtext.facet#underline";
            } | {
                $type: "pub.leaflet.richtext.facet#highlight";
            } | {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            } | {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            } | {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            } | {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            })[];
        }>, "many">>;
        level: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        $type: "pub.leaflet.blocks.header";
        plaintext: string;
        facets?: {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: ({
                $type: "pub.leaflet.richtext.facet#bold";
            } | {
                $type: "pub.leaflet.richtext.facet#italic";
            } | {
                $type: "pub.leaflet.richtext.facet#code";
            } | {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            } | {
                $type: "pub.leaflet.richtext.facet#underline";
            } | {
                $type: "pub.leaflet.richtext.facet#highlight";
            } | {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            } | {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            } | {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            } | {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            })[];
        }[] | undefined;
        level?: number | undefined;
    }, {
        $type: "pub.leaflet.blocks.header";
        plaintext: string;
        facets?: {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: ({
                $type: "pub.leaflet.richtext.facet#bold";
            } | {
                $type: "pub.leaflet.richtext.facet#italic";
            } | {
                $type: "pub.leaflet.richtext.facet#code";
            } | {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            } | {
                $type: "pub.leaflet.richtext.facet#underline";
            } | {
                $type: "pub.leaflet.richtext.facet#highlight";
            } | {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            } | {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            } | {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            } | {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            })[];
        }[] | undefined;
        level?: number | undefined;
    }>, z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.blocks.image">;
        image: z.ZodObject<{
            $type: z.ZodLiteral<"blob">;
            ref: z.ZodObject<{
                $link: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                $link: string;
            }, {
                $link: string;
            }>;
            mimeType: z.ZodString;
            size: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            ref: {
                $link: string;
            };
            $type: "blob";
            mimeType: string;
            size: number;
        }, {
            ref: {
                $link: string;
            };
            $type: "blob";
            mimeType: string;
            size: number;
        }>;
        alt: z.ZodOptional<z.ZodString>;
        aspectRatio: z.ZodOptional<z.ZodObject<{
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            height: number;
            width: number;
        }, {
            height: number;
            width: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        $type: "pub.leaflet.blocks.image";
        image: {
            ref: {
                $link: string;
            };
            $type: "blob";
            mimeType: string;
            size: number;
        };
        alt?: string | undefined;
        aspectRatio?: {
            height: number;
            width: number;
        } | undefined;
    }, {
        $type: "pub.leaflet.blocks.image";
        image: {
            ref: {
                $link: string;
            };
            $type: "blob";
            mimeType: string;
            size: number;
        };
        alt?: string | undefined;
        aspectRatio?: {
            height: number;
            width: number;
        } | undefined;
    }>, z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.blocks.blockquote">;
        plaintext: z.ZodString;
        facets: z.ZodOptional<z.ZodArray<z.ZodObject<{
            index: z.ZodObject<{
                byteStart: z.ZodNumber;
                byteEnd: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                byteStart: number;
                byteEnd: number;
            }, {
                byteStart: number;
                byteEnd: number;
            }>;
            features: z.ZodArray<z.ZodDiscriminatedUnion<"$type", [z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#bold">;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#bold";
            }, {
                $type: "pub.leaflet.richtext.facet#bold";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#italic">;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#italic";
            }, {
                $type: "pub.leaflet.richtext.facet#italic";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#code">;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#code";
            }, {
                $type: "pub.leaflet.richtext.facet#code";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#strikethrough">;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            }, {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#underline">;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#underline";
            }, {
                $type: "pub.leaflet.richtext.facet#underline";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#highlight">;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#highlight";
            }, {
                $type: "pub.leaflet.richtext.facet#highlight";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#link">;
                uri: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            }, {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#didMention">;
                did: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            }, {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#atMention">;
                atURI: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            }, {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            }>, z.ZodObject<{
                $type: z.ZodLiteral<"pub.leaflet.richtext.facet#id">;
                id: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            }, {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            }>]>, "many">;
        }, "strip", z.ZodTypeAny, {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: ({
                $type: "pub.leaflet.richtext.facet#bold";
            } | {
                $type: "pub.leaflet.richtext.facet#italic";
            } | {
                $type: "pub.leaflet.richtext.facet#code";
            } | {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            } | {
                $type: "pub.leaflet.richtext.facet#underline";
            } | {
                $type: "pub.leaflet.richtext.facet#highlight";
            } | {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            } | {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            } | {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            } | {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            })[];
        }, {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: ({
                $type: "pub.leaflet.richtext.facet#bold";
            } | {
                $type: "pub.leaflet.richtext.facet#italic";
            } | {
                $type: "pub.leaflet.richtext.facet#code";
            } | {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            } | {
                $type: "pub.leaflet.richtext.facet#underline";
            } | {
                $type: "pub.leaflet.richtext.facet#highlight";
            } | {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            } | {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            } | {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            } | {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            })[];
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        $type: "pub.leaflet.blocks.blockquote";
        plaintext: string;
        facets?: {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: ({
                $type: "pub.leaflet.richtext.facet#bold";
            } | {
                $type: "pub.leaflet.richtext.facet#italic";
            } | {
                $type: "pub.leaflet.richtext.facet#code";
            } | {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            } | {
                $type: "pub.leaflet.richtext.facet#underline";
            } | {
                $type: "pub.leaflet.richtext.facet#highlight";
            } | {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            } | {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            } | {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            } | {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            })[];
        }[] | undefined;
    }, {
        $type: "pub.leaflet.blocks.blockquote";
        plaintext: string;
        facets?: {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: ({
                $type: "pub.leaflet.richtext.facet#bold";
            } | {
                $type: "pub.leaflet.richtext.facet#italic";
            } | {
                $type: "pub.leaflet.richtext.facet#code";
            } | {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            } | {
                $type: "pub.leaflet.richtext.facet#underline";
            } | {
                $type: "pub.leaflet.richtext.facet#highlight";
            } | {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            } | {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            } | {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            } | {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            })[];
        }[] | undefined;
    }>, z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.blocks.unorderedList">;
        children: z.ZodArray<z.ZodType<LeafletListItem, z.ZodTypeDef, LeafletListItem>, "many">;
    }, "strip", z.ZodTypeAny, {
        children: LeafletListItem[];
        $type: "pub.leaflet.blocks.unorderedList";
    }, {
        children: LeafletListItem[];
        $type: "pub.leaflet.blocks.unorderedList";
    }>, z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.blocks.code">;
        plaintext: z.ZodString;
        language: z.ZodOptional<z.ZodString>;
        syntaxHighlightingTheme: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        $type: "pub.leaflet.blocks.code";
        plaintext: string;
        language?: string | undefined;
        syntaxHighlightingTheme?: string | undefined;
    }, {
        $type: "pub.leaflet.blocks.code";
        plaintext: string;
        language?: string | undefined;
        syntaxHighlightingTheme?: string | undefined;
    }>, z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.blocks.horizontalRule">;
    }, "strip", z.ZodTypeAny, {
        $type: "pub.leaflet.blocks.horizontalRule";
    }, {
        $type: "pub.leaflet.blocks.horizontalRule";
    }>, z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.blocks.iframe">;
        url: z.ZodString;
        height: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        $type: "pub.leaflet.blocks.iframe";
        url: string;
        height?: number | undefined;
    }, {
        $type: "pub.leaflet.blocks.iframe";
        url: string;
        height?: number | undefined;
    }>, z.ZodObject<{
        $type: z.ZodLiteral<"pub.leaflet.blocks.website">;
        src: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        $type: "pub.leaflet.blocks.website";
        src: string;
        title?: string | undefined;
        description?: string | undefined;
    }, {
        $type: "pub.leaflet.blocks.website";
        src: string;
        title?: string | undefined;
        description?: string | undefined;
    }>]>;
    alignment: z.ZodOptional<z.ZodEnum<["pub.leaflet.pages.linearDocument#textAlignLeft", "pub.leaflet.pages.linearDocument#textAlignCenter", "pub.leaflet.pages.linearDocument#textAlignRight", "pub.leaflet.pages.linearDocument#textAlignJustify"]>>;
}, "strip", z.ZodTypeAny, {
    block: {
        $type: "pub.leaflet.blocks.text";
        plaintext: string;
        facets?: {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: ({
                $type: "pub.leaflet.richtext.facet#bold";
            } | {
                $type: "pub.leaflet.richtext.facet#italic";
            } | {
                $type: "pub.leaflet.richtext.facet#code";
            } | {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            } | {
                $type: "pub.leaflet.richtext.facet#underline";
            } | {
                $type: "pub.leaflet.richtext.facet#highlight";
            } | {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            } | {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            } | {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            } | {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            })[];
        }[] | undefined;
        textSize?: "default" | "small" | "large" | undefined;
    } | {
        $type: "pub.leaflet.blocks.header";
        plaintext: string;
        facets?: {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: ({
                $type: "pub.leaflet.richtext.facet#bold";
            } | {
                $type: "pub.leaflet.richtext.facet#italic";
            } | {
                $type: "pub.leaflet.richtext.facet#code";
            } | {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            } | {
                $type: "pub.leaflet.richtext.facet#underline";
            } | {
                $type: "pub.leaflet.richtext.facet#highlight";
            } | {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            } | {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            } | {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            } | {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            })[];
        }[] | undefined;
        level?: number | undefined;
    } | {
        $type: "pub.leaflet.blocks.image";
        image: {
            ref: {
                $link: string;
            };
            $type: "blob";
            mimeType: string;
            size: number;
        };
        alt?: string | undefined;
        aspectRatio?: {
            height: number;
            width: number;
        } | undefined;
    } | {
        $type: "pub.leaflet.blocks.blockquote";
        plaintext: string;
        facets?: {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: ({
                $type: "pub.leaflet.richtext.facet#bold";
            } | {
                $type: "pub.leaflet.richtext.facet#italic";
            } | {
                $type: "pub.leaflet.richtext.facet#code";
            } | {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            } | {
                $type: "pub.leaflet.richtext.facet#underline";
            } | {
                $type: "pub.leaflet.richtext.facet#highlight";
            } | {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            } | {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            } | {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            } | {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            })[];
        }[] | undefined;
    } | {
        $type: "pub.leaflet.blocks.code";
        plaintext: string;
        language?: string | undefined;
        syntaxHighlightingTheme?: string | undefined;
    } | {
        $type: "pub.leaflet.blocks.horizontalRule";
    } | {
        $type: "pub.leaflet.blocks.iframe";
        url: string;
        height?: number | undefined;
    } | {
        $type: "pub.leaflet.blocks.website";
        src: string;
        title?: string | undefined;
        description?: string | undefined;
    } | {
        children: LeafletListItem[];
        $type: "pub.leaflet.blocks.unorderedList";
    };
    $type?: "pub.leaflet.pages.linearDocument#block" | undefined;
    alignment?: "pub.leaflet.pages.linearDocument#textAlignLeft" | "pub.leaflet.pages.linearDocument#textAlignCenter" | "pub.leaflet.pages.linearDocument#textAlignRight" | "pub.leaflet.pages.linearDocument#textAlignJustify" | undefined;
}, {
    block: {
        $type: "pub.leaflet.blocks.text";
        plaintext: string;
        facets?: {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: ({
                $type: "pub.leaflet.richtext.facet#bold";
            } | {
                $type: "pub.leaflet.richtext.facet#italic";
            } | {
                $type: "pub.leaflet.richtext.facet#code";
            } | {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            } | {
                $type: "pub.leaflet.richtext.facet#underline";
            } | {
                $type: "pub.leaflet.richtext.facet#highlight";
            } | {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            } | {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            } | {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            } | {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            })[];
        }[] | undefined;
        textSize?: "default" | "small" | "large" | undefined;
    } | {
        $type: "pub.leaflet.blocks.header";
        plaintext: string;
        facets?: {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: ({
                $type: "pub.leaflet.richtext.facet#bold";
            } | {
                $type: "pub.leaflet.richtext.facet#italic";
            } | {
                $type: "pub.leaflet.richtext.facet#code";
            } | {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            } | {
                $type: "pub.leaflet.richtext.facet#underline";
            } | {
                $type: "pub.leaflet.richtext.facet#highlight";
            } | {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            } | {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            } | {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            } | {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            })[];
        }[] | undefined;
        level?: number | undefined;
    } | {
        $type: "pub.leaflet.blocks.image";
        image: {
            ref: {
                $link: string;
            };
            $type: "blob";
            mimeType: string;
            size: number;
        };
        alt?: string | undefined;
        aspectRatio?: {
            height: number;
            width: number;
        } | undefined;
    } | {
        $type: "pub.leaflet.blocks.blockquote";
        plaintext: string;
        facets?: {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: ({
                $type: "pub.leaflet.richtext.facet#bold";
            } | {
                $type: "pub.leaflet.richtext.facet#italic";
            } | {
                $type: "pub.leaflet.richtext.facet#code";
            } | {
                $type: "pub.leaflet.richtext.facet#strikethrough";
            } | {
                $type: "pub.leaflet.richtext.facet#underline";
            } | {
                $type: "pub.leaflet.richtext.facet#highlight";
            } | {
                uri: string;
                $type: "pub.leaflet.richtext.facet#link";
            } | {
                $type: "pub.leaflet.richtext.facet#didMention";
                did: string;
            } | {
                $type: "pub.leaflet.richtext.facet#atMention";
                atURI: string;
            } | {
                $type: "pub.leaflet.richtext.facet#id";
                id?: string | undefined;
            })[];
        }[] | undefined;
    } | {
        $type: "pub.leaflet.blocks.code";
        plaintext: string;
        language?: string | undefined;
        syntaxHighlightingTheme?: string | undefined;
    } | {
        $type: "pub.leaflet.blocks.horizontalRule";
    } | {
        $type: "pub.leaflet.blocks.iframe";
        url: string;
        height?: number | undefined;
    } | {
        $type: "pub.leaflet.blocks.website";
        src: string;
        title?: string | undefined;
        description?: string | undefined;
    } | {
        children: LeafletListItem[];
        $type: "pub.leaflet.blocks.unorderedList";
    };
    $type?: "pub.leaflet.pages.linearDocument#block" | undefined;
    alignment?: "pub.leaflet.pages.linearDocument#textAlignLeft" | "pub.leaflet.pages.linearDocument#textAlignCenter" | "pub.leaflet.pages.linearDocument#textAlignRight" | "pub.leaflet.pages.linearDocument#textAlignJustify" | undefined;
}>;
declare const LeafletLinearDocumentSchema: z.ZodObject<{
    $type: z.ZodOptional<z.ZodLiteral<"pub.leaflet.pages.linearDocument">>;
    id: z.ZodOptional<z.ZodString>;
    blocks: z.ZodArray<z.ZodObject<{
        $type: z.ZodOptional<z.ZodLiteral<"pub.leaflet.pages.linearDocument#block">>;
        block: z.ZodDiscriminatedUnion<"$type", [z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.blocks.text">;
            plaintext: z.ZodString;
            facets: z.ZodOptional<z.ZodArray<z.ZodObject<{
                index: z.ZodObject<{
                    byteStart: z.ZodNumber;
                    byteEnd: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    byteStart: number;
                    byteEnd: number;
                }, {
                    byteStart: number;
                    byteEnd: number;
                }>;
                features: z.ZodArray<z.ZodDiscriminatedUnion<"$type", [z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#bold">;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#bold";
                }, {
                    $type: "pub.leaflet.richtext.facet#bold";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#italic">;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#italic";
                }, {
                    $type: "pub.leaflet.richtext.facet#italic";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#code">;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#code";
                }, {
                    $type: "pub.leaflet.richtext.facet#code";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#strikethrough">;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                }, {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#underline">;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#underline";
                }, {
                    $type: "pub.leaflet.richtext.facet#underline";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#highlight">;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#highlight";
                }, {
                    $type: "pub.leaflet.richtext.facet#highlight";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#link">;
                    uri: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                }, {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#didMention">;
                    did: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                }, {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#atMention">;
                    atURI: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                }, {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#id">;
                    id: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                }, {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                }>]>, "many">;
            }, "strip", z.ZodTypeAny, {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }, {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }>, "many">>;
            textSize: z.ZodOptional<z.ZodEnum<["default", "small", "large"]>>;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.blocks.text";
            plaintext: string;
            facets?: {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }[] | undefined;
            textSize?: "default" | "small" | "large" | undefined;
        }, {
            $type: "pub.leaflet.blocks.text";
            plaintext: string;
            facets?: {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }[] | undefined;
            textSize?: "default" | "small" | "large" | undefined;
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.blocks.header">;
            plaintext: z.ZodString;
            facets: z.ZodOptional<z.ZodArray<z.ZodObject<{
                index: z.ZodObject<{
                    byteStart: z.ZodNumber;
                    byteEnd: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    byteStart: number;
                    byteEnd: number;
                }, {
                    byteStart: number;
                    byteEnd: number;
                }>;
                features: z.ZodArray<z.ZodDiscriminatedUnion<"$type", [z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#bold">;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#bold";
                }, {
                    $type: "pub.leaflet.richtext.facet#bold";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#italic">;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#italic";
                }, {
                    $type: "pub.leaflet.richtext.facet#italic";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#code">;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#code";
                }, {
                    $type: "pub.leaflet.richtext.facet#code";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#strikethrough">;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                }, {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#underline">;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#underline";
                }, {
                    $type: "pub.leaflet.richtext.facet#underline";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#highlight">;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#highlight";
                }, {
                    $type: "pub.leaflet.richtext.facet#highlight";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#link">;
                    uri: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                }, {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#didMention">;
                    did: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                }, {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#atMention">;
                    atURI: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                }, {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#id">;
                    id: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                }, {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                }>]>, "many">;
            }, "strip", z.ZodTypeAny, {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }, {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }>, "many">>;
            level: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.blocks.header";
            plaintext: string;
            facets?: {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }[] | undefined;
            level?: number | undefined;
        }, {
            $type: "pub.leaflet.blocks.header";
            plaintext: string;
            facets?: {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }[] | undefined;
            level?: number | undefined;
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.blocks.image">;
            image: z.ZodObject<{
                $type: z.ZodLiteral<"blob">;
                ref: z.ZodObject<{
                    $link: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    $link: string;
                }, {
                    $link: string;
                }>;
                mimeType: z.ZodString;
                size: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                ref: {
                    $link: string;
                };
                $type: "blob";
                mimeType: string;
                size: number;
            }, {
                ref: {
                    $link: string;
                };
                $type: "blob";
                mimeType: string;
                size: number;
            }>;
            alt: z.ZodOptional<z.ZodString>;
            aspectRatio: z.ZodOptional<z.ZodObject<{
                width: z.ZodNumber;
                height: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                height: number;
                width: number;
            }, {
                height: number;
                width: number;
            }>>;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.blocks.image";
            image: {
                ref: {
                    $link: string;
                };
                $type: "blob";
                mimeType: string;
                size: number;
            };
            alt?: string | undefined;
            aspectRatio?: {
                height: number;
                width: number;
            } | undefined;
        }, {
            $type: "pub.leaflet.blocks.image";
            image: {
                ref: {
                    $link: string;
                };
                $type: "blob";
                mimeType: string;
                size: number;
            };
            alt?: string | undefined;
            aspectRatio?: {
                height: number;
                width: number;
            } | undefined;
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.blocks.blockquote">;
            plaintext: z.ZodString;
            facets: z.ZodOptional<z.ZodArray<z.ZodObject<{
                index: z.ZodObject<{
                    byteStart: z.ZodNumber;
                    byteEnd: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    byteStart: number;
                    byteEnd: number;
                }, {
                    byteStart: number;
                    byteEnd: number;
                }>;
                features: z.ZodArray<z.ZodDiscriminatedUnion<"$type", [z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#bold">;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#bold";
                }, {
                    $type: "pub.leaflet.richtext.facet#bold";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#italic">;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#italic";
                }, {
                    $type: "pub.leaflet.richtext.facet#italic";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#code">;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#code";
                }, {
                    $type: "pub.leaflet.richtext.facet#code";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#strikethrough">;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                }, {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#underline">;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#underline";
                }, {
                    $type: "pub.leaflet.richtext.facet#underline";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#highlight">;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#highlight";
                }, {
                    $type: "pub.leaflet.richtext.facet#highlight";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#link">;
                    uri: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                }, {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#didMention">;
                    did: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                }, {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#atMention">;
                    atURI: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                }, {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                }>, z.ZodObject<{
                    $type: z.ZodLiteral<"pub.leaflet.richtext.facet#id">;
                    id: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                }, {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                }>]>, "many">;
            }, "strip", z.ZodTypeAny, {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }, {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.blocks.blockquote";
            plaintext: string;
            facets?: {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }[] | undefined;
        }, {
            $type: "pub.leaflet.blocks.blockquote";
            plaintext: string;
            facets?: {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }[] | undefined;
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.blocks.unorderedList">;
            children: z.ZodArray<z.ZodType<LeafletListItem, z.ZodTypeDef, LeafletListItem>, "many">;
        }, "strip", z.ZodTypeAny, {
            children: LeafletListItem[];
            $type: "pub.leaflet.blocks.unorderedList";
        }, {
            children: LeafletListItem[];
            $type: "pub.leaflet.blocks.unorderedList";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.blocks.code">;
            plaintext: z.ZodString;
            language: z.ZodOptional<z.ZodString>;
            syntaxHighlightingTheme: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.blocks.code";
            plaintext: string;
            language?: string | undefined;
            syntaxHighlightingTheme?: string | undefined;
        }, {
            $type: "pub.leaflet.blocks.code";
            plaintext: string;
            language?: string | undefined;
            syntaxHighlightingTheme?: string | undefined;
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.blocks.horizontalRule">;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.blocks.horizontalRule";
        }, {
            $type: "pub.leaflet.blocks.horizontalRule";
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.blocks.iframe">;
            url: z.ZodString;
            height: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.blocks.iframe";
            url: string;
            height?: number | undefined;
        }, {
            $type: "pub.leaflet.blocks.iframe";
            url: string;
            height?: number | undefined;
        }>, z.ZodObject<{
            $type: z.ZodLiteral<"pub.leaflet.blocks.website">;
            src: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            $type: "pub.leaflet.blocks.website";
            src: string;
            title?: string | undefined;
            description?: string | undefined;
        }, {
            $type: "pub.leaflet.blocks.website";
            src: string;
            title?: string | undefined;
            description?: string | undefined;
        }>]>;
        alignment: z.ZodOptional<z.ZodEnum<["pub.leaflet.pages.linearDocument#textAlignLeft", "pub.leaflet.pages.linearDocument#textAlignCenter", "pub.leaflet.pages.linearDocument#textAlignRight", "pub.leaflet.pages.linearDocument#textAlignJustify"]>>;
    }, "strip", z.ZodTypeAny, {
        block: {
            $type: "pub.leaflet.blocks.text";
            plaintext: string;
            facets?: {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }[] | undefined;
            textSize?: "default" | "small" | "large" | undefined;
        } | {
            $type: "pub.leaflet.blocks.header";
            plaintext: string;
            facets?: {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }[] | undefined;
            level?: number | undefined;
        } | {
            $type: "pub.leaflet.blocks.image";
            image: {
                ref: {
                    $link: string;
                };
                $type: "blob";
                mimeType: string;
                size: number;
            };
            alt?: string | undefined;
            aspectRatio?: {
                height: number;
                width: number;
            } | undefined;
        } | {
            $type: "pub.leaflet.blocks.blockquote";
            plaintext: string;
            facets?: {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }[] | undefined;
        } | {
            $type: "pub.leaflet.blocks.code";
            plaintext: string;
            language?: string | undefined;
            syntaxHighlightingTheme?: string | undefined;
        } | {
            $type: "pub.leaflet.blocks.horizontalRule";
        } | {
            $type: "pub.leaflet.blocks.iframe";
            url: string;
            height?: number | undefined;
        } | {
            $type: "pub.leaflet.blocks.website";
            src: string;
            title?: string | undefined;
            description?: string | undefined;
        } | {
            children: LeafletListItem[];
            $type: "pub.leaflet.blocks.unorderedList";
        };
        $type?: "pub.leaflet.pages.linearDocument#block" | undefined;
        alignment?: "pub.leaflet.pages.linearDocument#textAlignLeft" | "pub.leaflet.pages.linearDocument#textAlignCenter" | "pub.leaflet.pages.linearDocument#textAlignRight" | "pub.leaflet.pages.linearDocument#textAlignJustify" | undefined;
    }, {
        block: {
            $type: "pub.leaflet.blocks.text";
            plaintext: string;
            facets?: {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }[] | undefined;
            textSize?: "default" | "small" | "large" | undefined;
        } | {
            $type: "pub.leaflet.blocks.header";
            plaintext: string;
            facets?: {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }[] | undefined;
            level?: number | undefined;
        } | {
            $type: "pub.leaflet.blocks.image";
            image: {
                ref: {
                    $link: string;
                };
                $type: "blob";
                mimeType: string;
                size: number;
            };
            alt?: string | undefined;
            aspectRatio?: {
                height: number;
                width: number;
            } | undefined;
        } | {
            $type: "pub.leaflet.blocks.blockquote";
            plaintext: string;
            facets?: {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }[] | undefined;
        } | {
            $type: "pub.leaflet.blocks.code";
            plaintext: string;
            language?: string | undefined;
            syntaxHighlightingTheme?: string | undefined;
        } | {
            $type: "pub.leaflet.blocks.horizontalRule";
        } | {
            $type: "pub.leaflet.blocks.iframe";
            url: string;
            height?: number | undefined;
        } | {
            $type: "pub.leaflet.blocks.website";
            src: string;
            title?: string | undefined;
            description?: string | undefined;
        } | {
            children: LeafletListItem[];
            $type: "pub.leaflet.blocks.unorderedList";
        };
        $type?: "pub.leaflet.pages.linearDocument#block" | undefined;
        alignment?: "pub.leaflet.pages.linearDocument#textAlignLeft" | "pub.leaflet.pages.linearDocument#textAlignCenter" | "pub.leaflet.pages.linearDocument#textAlignRight" | "pub.leaflet.pages.linearDocument#textAlignJustify" | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    blocks: {
        block: {
            $type: "pub.leaflet.blocks.text";
            plaintext: string;
            facets?: {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }[] | undefined;
            textSize?: "default" | "small" | "large" | undefined;
        } | {
            $type: "pub.leaflet.blocks.header";
            plaintext: string;
            facets?: {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }[] | undefined;
            level?: number | undefined;
        } | {
            $type: "pub.leaflet.blocks.image";
            image: {
                ref: {
                    $link: string;
                };
                $type: "blob";
                mimeType: string;
                size: number;
            };
            alt?: string | undefined;
            aspectRatio?: {
                height: number;
                width: number;
            } | undefined;
        } | {
            $type: "pub.leaflet.blocks.blockquote";
            plaintext: string;
            facets?: {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }[] | undefined;
        } | {
            $type: "pub.leaflet.blocks.code";
            plaintext: string;
            language?: string | undefined;
            syntaxHighlightingTheme?: string | undefined;
        } | {
            $type: "pub.leaflet.blocks.horizontalRule";
        } | {
            $type: "pub.leaflet.blocks.iframe";
            url: string;
            height?: number | undefined;
        } | {
            $type: "pub.leaflet.blocks.website";
            src: string;
            title?: string | undefined;
            description?: string | undefined;
        } | {
            children: LeafletListItem[];
            $type: "pub.leaflet.blocks.unorderedList";
        };
        $type?: "pub.leaflet.pages.linearDocument#block" | undefined;
        alignment?: "pub.leaflet.pages.linearDocument#textAlignLeft" | "pub.leaflet.pages.linearDocument#textAlignCenter" | "pub.leaflet.pages.linearDocument#textAlignRight" | "pub.leaflet.pages.linearDocument#textAlignJustify" | undefined;
    }[];
    $type?: "pub.leaflet.pages.linearDocument" | undefined;
    id?: string | undefined;
}, {
    blocks: {
        block: {
            $type: "pub.leaflet.blocks.text";
            plaintext: string;
            facets?: {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }[] | undefined;
            textSize?: "default" | "small" | "large" | undefined;
        } | {
            $type: "pub.leaflet.blocks.header";
            plaintext: string;
            facets?: {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }[] | undefined;
            level?: number | undefined;
        } | {
            $type: "pub.leaflet.blocks.image";
            image: {
                ref: {
                    $link: string;
                };
                $type: "blob";
                mimeType: string;
                size: number;
            };
            alt?: string | undefined;
            aspectRatio?: {
                height: number;
                width: number;
            } | undefined;
        } | {
            $type: "pub.leaflet.blocks.blockquote";
            plaintext: string;
            facets?: {
                index: {
                    byteStart: number;
                    byteEnd: number;
                };
                features: ({
                    $type: "pub.leaflet.richtext.facet#bold";
                } | {
                    $type: "pub.leaflet.richtext.facet#italic";
                } | {
                    $type: "pub.leaflet.richtext.facet#code";
                } | {
                    $type: "pub.leaflet.richtext.facet#strikethrough";
                } | {
                    $type: "pub.leaflet.richtext.facet#underline";
                } | {
                    $type: "pub.leaflet.richtext.facet#highlight";
                } | {
                    uri: string;
                    $type: "pub.leaflet.richtext.facet#link";
                } | {
                    $type: "pub.leaflet.richtext.facet#didMention";
                    did: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#atMention";
                    atURI: string;
                } | {
                    $type: "pub.leaflet.richtext.facet#id";
                    id?: string | undefined;
                })[];
            }[] | undefined;
        } | {
            $type: "pub.leaflet.blocks.code";
            plaintext: string;
            language?: string | undefined;
            syntaxHighlightingTheme?: string | undefined;
        } | {
            $type: "pub.leaflet.blocks.horizontalRule";
        } | {
            $type: "pub.leaflet.blocks.iframe";
            url: string;
            height?: number | undefined;
        } | {
            $type: "pub.leaflet.blocks.website";
            src: string;
            title?: string | undefined;
            description?: string | undefined;
        } | {
            children: LeafletListItem[];
            $type: "pub.leaflet.blocks.unorderedList";
        };
        $type?: "pub.leaflet.pages.linearDocument#block" | undefined;
        alignment?: "pub.leaflet.pages.linearDocument#textAlignLeft" | "pub.leaflet.pages.linearDocument#textAlignCenter" | "pub.leaflet.pages.linearDocument#textAlignRight" | "pub.leaflet.pages.linearDocument#textAlignJustify" | undefined;
    }[];
    $type?: "pub.leaflet.pages.linearDocument" | undefined;
    id?: string | undefined;
}>;
type LeafletLinearDocumentInput = z.input<typeof LeafletLinearDocumentSchema>;

export { LeafletBlobRefSchema, LeafletBlockAlignmentSchema, LeafletBlockSchema, LeafletBlockWrapperSchema, LeafletBlockquoteBlockSchema, LeafletByteSliceSchema, LeafletCodeBlockSchema, LeafletFacetFeatureSchema, LeafletFacetSchema, LeafletHeaderBlockSchema, LeafletHorizontalRuleBlockSchema, LeafletIframeBlockSchema, LeafletImageBlockSchema, type LeafletLinearDocumentInput, LeafletLinearDocumentSchema, LeafletListItemSchema, LeafletTextBlockSchema, LeafletUnorderedListBlockSchema, LeafletWebsiteBlockSchema };
