<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupMember extends Model
{
    protected $fillable = ['group_id', 'name', 'phone', 'email', 'note'];

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }
}
