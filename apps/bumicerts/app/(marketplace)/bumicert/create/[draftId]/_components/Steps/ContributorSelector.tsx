"use client";

import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Link as LinkIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { useDebounce } from "@/hooks/use-debounce";
import { links } from "@/lib/links";

// Type for ATProto actor
interface Actor {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
}

interface ContributorSelectorProps {
    value: string;
    onChange: (value: string) => void;
    onClear: () => void;
    onNext?: (val?: string) => void;
    autoFocus?: boolean;
}

type Tab = "search" | "manual";

export function ContributorSelector({
    value,
    onChange,
    onClear,
    onNext,
    autoFocus,
}: ContributorSelectorProps) {
    const [activeTab, setActiveTab] = useState<Tab>("manual");
    const [query, setQuery] = useState(value);
    const [actors, setActors] = useState<Actor[]>([]);
    const [loading, setLoading] = useState(false);

    // For manual input
    const [manualQuery, setManualQuery] = useState(value);

    // Debounce query for search
    const debouncedQuery = useDebounce(query, 300);

    // Sync internal state with external value and on tab switch
    useEffect(() => {
        if (activeTab === 'search') {
            setQuery(value);
        } else {
            setManualQuery(value);
        }
    }, [value, activeTab]);

    // Search Effect
    useEffect(() => {
        if (activeTab !== "search") return;

        const searchActors = async () => {
            if (!debouncedQuery || debouncedQuery.length < 3) {
                setActors([]);
                return;
            }

            setLoading(true);
            try {
                const res = await fetch(links.api.searchActors(debouncedQuery, 5));

                if (!res.ok) {
                    throw new Error("Failed to fetch");
                }

                const data = await res.json();
                setActors(data.actors || []);
            } catch (error) {
                console.error("Failed to search actors", error);
            } finally {
                setLoading(false);
            }
        };

        searchActors();
    }, [debouncedQuery, activeTab]);

    const handleSelect = (actor: Actor) => {
        onChange(actor.did);
        setQuery("");
        onNext?.(actor.did);
    };

    // Handle manual input change
    const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setManualQuery(newValue);
        onChange(newValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            onNext?.();
        }
    };

    const showClearButton = activeTab === "search" ? query.length > 0 : manualQuery.length > 0;

    return (
        <div className="flex flex-col gap-2 w-full rounded-md">
            <div className="flex bg-muted rounded-lg p-1 gap-1 w-fit">
                <button
                    type="button"
                    onClick={() => setActiveTab("search")}
                    className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                        activeTab === "search"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                >
                    Search Users
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("manual")}
                    className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                        activeTab === "manual"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                >
                    Enter Name or ID
                </button>
            </div>

            <div className="relative w-full">
                {activeTab === "search" ? (
                    <Command className="border rounded-md bg-background overflow-hidden" shouldFilter={false}>
                        <div className="flex items-center gap-2 pr-2 [&>[data-slot=command-input-wrapper]]:flex-1 [&>[data-slot=command-input-wrapper]]:border-b-0">
                            <CommandInput
                                placeholder="Search by handle or name..."
                                value={query}
                                onValueChange={setQuery}
                                autoFocus={autoFocus}
                            />
                            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                            {showClearButton && !loading && (
                                <button
                                    type="button"
                                    onClick={onClear}
                                    className="h-4 w-4 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="border-t"></div>
                        <CommandList>
                            {!loading && actors.length === 0 && !!query && (
                                <CommandEmpty className="py-6 text-center text-sm">No results found.</CommandEmpty>
                            )}
                            {actors.length > 0 && (
                                <CommandGroup heading="Suggestions">
                                    {actors.map((actor) => (
                                        <CommandItem
                                            key={actor.did}
                                            value={actor.handle} // Use handle for value to avoid funky filtering if we enabled it
                                            onSelect={() => handleSelect(actor)}
                                            className="flex items-center gap-2 cursor-pointer"
                                        >
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={actor.avatar} />
                                                <AvatarFallback>{actor.handle[0].toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="font-medium truncate">{actor.displayName || actor.handle}</span>
                                                <span className="text-xs text-muted-foreground truncate">@{actor.handle}</span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                ) : (
                    <InputGroup className="bg-background">
                        <LinkIcon className="h-4 w-4 ml-2 text-muted-foreground" />
                        <InputGroupInput
                            placeholder="Contributor name, DID, or URI..."
                            value={manualQuery}
                            onChange={handleManualInputChange}
                            onKeyDown={handleKeyDown}
                            autoFocus={autoFocus}
                        />
                        {showClearButton && (
                            <button
                                type="button"
                                onClick={onClear}
                                className="h-4 w-4 mr-3 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </InputGroup>
                )}
            </div>
        </div>
    );
}
