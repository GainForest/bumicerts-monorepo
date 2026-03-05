"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trash2Icon, PencilIcon, CheckIcon, XIcon } from "lucide-react";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { queries, type ActorProfile } from "@/lib/graphql/queries/index";

interface ContributorRowProps {
    value: string;
    onEdit: (newValue: string) => void;
    onRemove: () => void;
}

function isDidOrHandle(value: string): boolean {
    // DID format: did:plc:... or did:web:...
    if (value.startsWith("did:")) return true;
    // Handle format: contains dot, no spaces (e.g., user.bsky.social)
    if (value.includes(".") && !value.includes(" ")) return true;
    return false;
}

export function ContributorRow({ value, onEdit, onRemove }: ContributorRowProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);

    const shouldFetch = isDidOrHandle(value);

    const { data: profile, isPending } = queries.actor.useQuery({ handleOrDid: value });

    const handleSave = () => {
        onEdit(editValue);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditValue(value);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
        } else if (e.key === "Escape") {
            handleCancel();
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-2 p-3 border rounded-md bg-background">
                <InputGroup className="flex-1">
                    <InputGroupInput
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                        onKeyDown={handleKeyDown}
                    />
                </InputGroup>
                <Button size="icon-sm" variant="ghost" onClick={handleSave}>
                    <CheckIcon className="size-4 text-green-500" />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={handleCancel}>
                    <XIcon className="size-4 text-muted-foreground" />
                </Button>
            </div>
        );
    }

    // Determine what to display
    const hasProfile = shouldFetch && profile && !isPending;
    const displayName = hasProfile ? (profile.displayName || profile.handle) : value;
    const handle = hasProfile ? `@${profile.handle}` : null;
    const avatarUrl = hasProfile ? profile.avatar : undefined;
    const fallbackChar = (hasProfile ? profile.handle[0] : value[0])?.toUpperCase() || "?";

    return (
        <div className="flex items-center justify-between p-3 border rounded-md bg-background">
            <div className="flex items-center gap-3 overflow-hidden">
                <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback>{fallbackChar}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                    <span className="font-medium truncate">{displayName}</span>
                    {handle && (
                        <span className="text-xs text-muted-foreground truncate">{handle}</span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <PencilIcon className="size-4" />
                </Button>
                <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={onRemove}
                    className="text-muted-foreground hover:text-destructive"
                >
                    <Trash2Icon className="size-4" />
                </Button>
            </div>
        </div>
    );
}
