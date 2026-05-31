<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserMember extends Model
{
    protected $fillable = [
        'owner_id',
        'member_id',
    ];
}