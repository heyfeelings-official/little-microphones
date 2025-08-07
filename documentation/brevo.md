Get all Companies

# OpenAPI definition
```json
{
  "openapi": "3.0.1",
  "info": {
    "title": "Brevo API",
    "description": "Brevo provide a RESTFul API that can be used with any languages. With this API, you will be able to :\n  - Manage your campaigns and get the statistics\n  - Manage your contacts\n  - Send transactional Emails and SMS\n  - and much more...\n\nYou can download our wrappers at https://github.com/orgs/brevo\n\n**Possible responses**\n  | Code | Message |\n  | :-------------: | ------------- |\n  | 200  | OK. Successful Request  |\n  | 201  | OK. Successful Creation |\n  | 202  | OK. Request accepted |\n  | 204  | OK. Successful Update/Deletion  |\n  | 400  | Error. Bad Request  |\n  | 401  | Error. Authentication Needed  |\n  | 402  | Error. Not enough credit, plan upgrade needed  |\n  | 403  | Error. Permission denied  |\n  | 404  | Error. Object does not exist |\n  | 405  | Error. Method not allowed  |\n  | 406  | Error. Not Acceptable  |\n  | 422  | Error. Unprocessable Entity |\n",
    "contact": {
      "name": "Brevo Support",
      "url": "https://account.brevo.com/support",
      "email": "contact@brevo.com"
    },
    "license": {
      "name": "MIT",
      "url": "http://opensource.org/licenses/MIT"
    },
    "version": "3.0.0"
  },
  "servers": [
    {
      "url": "https://api.brevo.com/v3"
    }
  ],
  "security": [
    {
      "api-key": []
    }
  ],
  "paths": {
    "/companies": {
      "get": {
        "tags": [
          "Companies"
        ],
        "summary": "Get all Companies",
        "parameters": [
          {
            "name": "filters",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Filter by attrbutes. If you have filter for owner on your side please send it as {\"attributes.owner\":\"6299dcf3874a14eacbc65c46\"}"
          },
          {
            "name": "linkedContactsIds",
            "in": "query",
            "schema": {
              "type": "integer",
              "format": "int64"
            },
            "description": "Filter by linked contacts ids"
          },
          {
            "name": "linkedDealsIds",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "objectID"
            },
            "description": "Filter by linked Deals ids"
          },
          {
            "name": "modifiedSince",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Filter (urlencoded) the contacts modified after a given UTC date-time (YYYY-MM-DDTHH:mm:ss.SSSZ). Prefer to pass your timezone in date-time format for accurate result."
          },
          {
            "name": "createdSince",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Filter (urlencoded) the contacts created after a given UTC date-time (YYYY-MM-DDTHH:mm:ss.SSSZ). Prefer to pass your timezone in date-time format for accurate result."
          },
          {
            "name": "page",
            "in": "query",
            "schema": {
              "type": "integer",
              "format": "int64"
            },
            "description": "Index of the first document of the page"
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer",
              "format": "int64"
            },
            "description": "Number of documents per page"
          },
          {
            "name": "sort",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "asc",
                "desc"
              ]
            },
            "description": "Sort the results in the ascending/descending order. Default order is **descending** by creation if `sort` is not passed"
          },
          {
            "name": "sortBy",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "The field used to sort field names."
          }
        ],
        "responses": {
          "200": {
            "description": "Returns companies list with filters",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "description": "List of companies",
                  "properties": {
                    "items": {
                      "type": "array",
                      "description": "List of compaies",
                      "items": {
                        "type": "object",
                        "description": "Company Details",
                        "properties": {
                          "id": {
                            "type": "string",
                            "description": "Unique comoany id",
                            "example": "629475917295261d9b1f4403"
                          },
                          "attributes": {
                            "type": "object",
                            "description": "Company attributes with values",
                            "example": {
                              "created_at": "2022-01-13T19:04:24.376+05:30",
                              "domain": "xyz",
                              "last_updated_at": "2022-04-01T18:47:48.283+05:30",
                              "name": "text",
                              "number_of_contacts": 0,
                              "owner": "62260474111b1101704a9d85",
                              "owner_assign_date": "2022-04-01T18:21:13.379+05:30",
                              "phone_number": 8171844192,
                              "revenue": 10
                            }
                          },
                          "linkedContactsIds": {
                            "items": {
                              "type": "integer"
                            },
                            "type": "array",
                            "format": "in64",
                            "description": "Contact ids for contacts linked to this company",
                            "example": [
                              1,
                              2,
                              3
                            ]
                          },
                          "linkedDealsIds": {
                            "items": {
                              "type": "string"
                            },
                            "type": "array",
                            "format": "objectID",
                            "description": "Deals ids for companies linked to this company",
                            "example": [
                              "61a5ce58c5d4795761045990",
                              "61a5ce58c5d4795761045991",
                              "61a5ce58c5d4795761045992"
                            ]
                          }
                        },
                        "x-readme-ref-name": "Company"
                      }
                    }
                  },
                  "x-readme-ref-name": "CompaniesList"
                }
              }
            }
          },
          "400": {
            "description": "Returned when query params are invalid",
            "content": {
              "application/json": {
                "schema": {
                  "required": [
                    "code",
                    "message"
                  ],
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "description": "Error code displayed in case of a failure",
                      "example": "method_not_allowed",
                      "enum": [
                        "invalid_parameter",
                        "missing_parameter",
                        "out_of_range",
                        "campaign_processing",
                        "campaign_sent",
                        "document_not_found",
                        "not_enough_credits",
                        "permission_denied",
                        "duplicate_parameter",
                        "duplicate_request",
                        "method_not_allowed",
                        "unauthorized",
                        "account_under_validation",
                        "not_acceptable",
                        "bad_request",
                        "unprocessable_entity"
                      ]
                    },
                    "message": {
                      "type": "string",
                      "description": "Readable message associated to the failure",
                      "example": "POST Method is not allowed on this path"
                    }
                  },
                  "x-readme-ref-name": "errorModel"
                },
                "examples": {
                  "response": {
                    "value": {
                      "message": "Not valid data."
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "api-key": {
        "type": "apiKey",
        "description": "The API key should be passed in the request headers as `api-key` for authentication.",
        "name": "api-key",
        "in": "header"
      }
    }
  },
  "x-samples-languages": [
    "curl"
  ],
  "x-readme": {
    "explorer-enabled": true,
    "proxy-enabled": true
  },
  "_id": "5b68b4cdf052cf0003243f8e"
}
```

Create a company

# OpenAPI definition
```json
{
    "openapi": "3.0.1",
    "info": {
        "title": "Brevo API",
        "description": "Brevo provide a RESTFul API that can be used with any languages. With this API, you will be able to :\n  - Manage your campaigns and get the statistics\n  - Manage your contacts\n  - Send transactional Emails and SMS\n  - and much more...\n\nYou can download our wrappers at https://github.com/orgs/brevo\n\n**Possible responses**\n  | Code | Message |\n  | :-------------: | ------------- |\n  | 200  | OK. Successful Request  |\n  | 201  | OK. Successful Creation |\n  | 202  | OK. Request accepted |\n  | 204  | OK. Successful Update/Deletion  |\n  | 400  | Error. Bad Request  |\n  | 401  | Error. Authentication Needed  |\n  | 402  | Error. Not enough credit, plan upgrade needed  |\n  | 403  | Error. Permission denied  |\n  | 404  | Error. Object does not exist |\n  | 405  | Error. Method not allowed  |\n  | 406  | Error. Not Acceptable  |\n  | 422  | Error. Unprocessable Entity |\n",
        "contact": {
            "name": "Brevo Support",
            "url": "https://account.brevo.com/support",
            "email": "contact@brevo.com"
        },
        "license": {
            "name": "MIT",
            "url": "http://opensource.org/licenses/MIT"
        },
        "version": "3.0.0"
    },
    "servers": [
        {
            "url": "https://api.brevo.com/v3"
        }
    ],
    "security": [
        {
            "api-key": []
        }
    ],
    "paths": {
        "/companies": {
            "post": {
                "tags": [
                    "Companies"
                ],
                "summary": "Create a company",
                "requestBody": {
                    "required": true,
                    "description": "Company create data.",
                    "content": {
                        "application/json": {
                            "schema": {
                                "required": [
                                    "name"
                                ],
                                "properties": {
                                    "name": {
                                        "type": "string",
                                        "description": "Name of company",
                                        "example": "company"
                                    },
                                    "attributes": {
                                        "type": "object",
                                        "description": "Attributes for company creation",
                                        "example": {
                                            "domain": "https://example.com",
                                            "industry": "Fabric",
                                            "owner": "60e68d60582a3b006f524197"
                                        }
                                    },
                                    "countryCode": {
                                        "type": "integer",
                                        "format": "int64",
                                        "description": "Country code if phone_number is passed in attributes.",
                                        "example": 91
                                    },
                                    "linkedContactsIds": {
                                        "items": {
                                            "type": "integer",
                                            "format": "int64"
                                        },
                                        "type": "array",
                                        "description": "Contact ids to be linked with company",
                                        "example": [
                                            1,
                                            2,
                                            3
                                        ]
                                    },
                                    "linkedDealsIds": {
                                        "items": {
                                            "type": "string",
                                            "format": "objectID"
                                        },
                                        "type": "array",
                                        "description": "Deal ids to be linked with company",
                                        "example": [
                                            "61a5ce58c5d4795761045990",
                                            "61a5ce58c5d4795761045991",
                                            "61a5ce58c5d4795761045992"
                                        ]
                                    }
                                },
                                "type": "object"
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Created new Company",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "required": [
                                        "id"
                                    ],
                                    "type": "object",
                                    "description": "Created company id",
                                    "properties": {
                                        "id": {
                                            "type": "string",
                                            "description": "Unique company id",
                                            "example": "61a5cd07ca1347c82306ad06"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "400": {
                        "description": "Returned when invalid data posted",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "required": [
                                        "code",
                                        "message"
                                    ],
                                    "type": "object",
                                    "properties": {
                                        "code": {
                                            "type": "string",
                                            "description": "Error code displayed in case of a failure",
                                            "example": "method_not_allowed",
                                            "enum": [
                                                "invalid_parameter",
                                                "missing_parameter",
                                                "out_of_range",
                                                "campaign_processing",
                                                "campaign_sent",
                                                "document_not_found",
                                                "not_enough_credits",
                                                "permission_denied",
                                                "duplicate_parameter",
                                                "duplicate_request",
                                                "method_not_allowed",
                                                "unauthorized",
                                                "account_under_validation",
                                                "not_acceptable",
                                                "bad_request",
                                                "unprocessable_entity"
                                            ]
                                        },
                                        "message": {
                                            "type": "string",
                                            "description": "Readable message associated to the failure",
                                            "example": "POST Method is not allowed on this path"
                                        }
                                    },
                                    "x-readme-ref-name": "errorModel"
                                },
                                "examples": {
                                    "response": {
                                        "value": {
                                            "message": "Not valid data."
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    "components": {
        "securitySchemes": {
            "api-key": {
                "type": "apiKey",
                "description": "The API key should be passed in the request headers as `api-key` for authentication.",
                "name": "api-key",
                "in": "header"
            }
        }
    },
    "x-samples-languages": [
        "curl"
    ],
    "x-readme": {
        "explorer-enabled": true,
        "proxy-enabled": true
    },
    "_id": "5b68b4cdf052cf0003243f8e"
}
```


Get a company

# OpenAPI definition
```json
{
    "openapi": "3.0.1",
    "info": {
        "title": "Brevo API",
        "description": "Brevo provide a RESTFul API that can be used with any languages. With this API, you will be able to :\n  - Manage your campaigns and get the statistics\n  - Manage your contacts\n  - Send transactional Emails and SMS\n  - and much more...\n\nYou can download our wrappers at https://github.com/orgs/brevo\n\n**Possible responses**\n  | Code | Message |\n  | :-------------: | ------------- |\n  | 200  | OK. Successful Request  |\n  | 201  | OK. Successful Creation |\n  | 202  | OK. Request accepted |\n  | 204  | OK. Successful Update/Deletion  |\n  | 400  | Error. Bad Request  |\n  | 401  | Error. Authentication Needed  |\n  | 402  | Error. Not enough credit, plan upgrade needed  |\n  | 403  | Error. Permission denied  |\n  | 404  | Error. Object does not exist |\n  | 405  | Error. Method not allowed  |\n  | 406  | Error. Not Acceptable  |\n  | 422  | Error. Unprocessable Entity |\n",
        "contact": {
            "name": "Brevo Support",
            "url": "https://account.brevo.com/support",
            "email": "contact@brevo.com"
        },
        "license": {
            "name": "MIT",
            "url": "http://opensource.org/licenses/MIT"
        },
        "version": "3.0.0"
    },
    "servers": [
        {
            "url": "https://api.brevo.com/v3"
        }
    ],
    "security": [
        {
            "api-key": []
        }
    ],
    "paths": {
        "/companies/{id}": {
            "get": {
                "tags": [
                    "Companies"
                ],
                "summary": "Get a company",
                "parameters": [
                    {
                        "name": "id",
                        "in": "path",
                        "required": true,
                        "schema": {
                            "type": "string"
                        },
                        "description": "Get Company Details"
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Returns the Company",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "description": "Company Details",
                                    "properties": {
                                        "id": {
                                            "type": "string",
                                            "description": "Unique comoany id",
                                            "example": "629475917295261d9b1f4403"
                                        },
                                        "attributes": {
                                            "type": "object",
                                            "description": "Company attributes with values",
                                            "example": {
                                                "created_at": "2022-01-13T19:04:24.376+05:30",
                                                "domain": "xyz",
                                                "last_updated_at": "2022-04-01T18:47:48.283+05:30",
                                                "name": "text",
                                                "number_of_contacts": 0,
                                                "owner": "62260474111b1101704a9d85",
                                                "owner_assign_date": "2022-04-01T18:21:13.379+05:30",
                                                "phone_number": 8171844192,
                                                "revenue": 10
                                            }
                                        },
                                        "linkedContactsIds": {
                                            "items": {
                                                "type": "integer"
                                            },
                                            "type": "array",
                                            "format": "in64",
                                            "description": "Contact ids for contacts linked to this company",
                                            "example": [
                                                1,
                                                2,
                                                3
                                            ]
                                        },
                                        "linkedDealsIds": {
                                            "items": {
                                                "type": "string"
                                            },
                                            "type": "array",
                                            "format": "objectID",
                                            "description": "Deals ids for companies linked to this company",
                                            "example": [
                                                "61a5ce58c5d4795761045990",
                                                "61a5ce58c5d4795761045991",
                                                "61a5ce58c5d4795761045992"
                                            ]
                                        }
                                    },
                                    "x-readme-ref-name": "Company"
                                }
                            }
                        }
                    },
                    "400": {
                        "description": "Returned when invalid data posted",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "required": [
                                        "code",
                                        "message"
                                    ],
                                    "type": "object",
                                    "properties": {
                                        "code": {
                                            "type": "string",
                                            "description": "Error code displayed in case of a failure",
                                            "example": "method_not_allowed",
                                            "enum": [
                                                "invalid_parameter",
                                                "missing_parameter",
                                                "out_of_range",
                                                "campaign_processing",
                                                "campaign_sent",
                                                "document_not_found",
                                                "not_enough_credits",
                                                "permission_denied",
                                                "duplicate_parameter",
                                                "duplicate_request",
                                                "method_not_allowed",
                                                "unauthorized",
                                                "account_under_validation",
                                                "not_acceptable",
                                                "bad_request",
                                                "unprocessable_entity"
                                            ]
                                        },
                                        "message": {
                                            "type": "string",
                                            "description": "Readable message associated to the failure",
                                            "example": "POST Method is not allowed on this path"
                                        }
                                    },
                                    "x-readme-ref-name": "errorModel"
                                },
                                "examples": {
                                    "response": {
                                        "value": {
                                            "message": "Route company id is not valid."
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "404": {
                        "description": "Returned when item not found",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "required": [
                                        "code",
                                        "message"
                                    ],
                                    "type": "object",
                                    "properties": {
                                        "code": {
                                            "type": "string",
                                            "description": "Error code displayed in case of a failure",
                                            "example": "method_not_allowed",
                                            "enum": [
                                                "invalid_parameter",
                                                "missing_parameter",
                                                "out_of_range",
                                                "campaign_processing",
                                                "campaign_sent",
                                                "document_not_found",
                                                "not_enough_credits",
                                                "permission_denied",
                                                "duplicate_parameter",
                                                "duplicate_request",
                                                "method_not_allowed",
                                                "unauthorized",
                                                "account_under_validation",
                                                "not_acceptable",
                                                "bad_request",
                                                "unprocessable_entity"
                                            ]
                                        },
                                        "message": {
                                            "type": "string",
                                            "description": "Readable message associated to the failure",
                                            "example": "POST Method is not allowed on this path"
                                        }
                                    },
                                    "x-readme-ref-name": "errorModel"
                                },
                                "examples": {
                                    "response": {
                                        "value": {
                                            "message": "Document not found"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    "components": {
        "securitySchemes": {
            "api-key": {
                "type": "apiKey",
                "description": "The API key should be passed in the request headers as `api-key` for authentication.",
                "name": "api-key",
                "in": "header"
            }
        }
    },
    "x-samples-languages": [
        "curl"
    ],
    "x-readme": {
        "explorer-enabled": true,
        "proxy-enabled": true
    },
    "_id": "5b68b4cdf052cf0003243f8e"
}
```

Delete a company

# OpenAPI definition
```json
{
    "openapi": "3.0.1",
    "info": {
        "title": "Brevo API",
        "description": "Brevo provide a RESTFul API that can be used with any languages. With this API, you will be able to :\n  - Manage your campaigns and get the statistics\n  - Manage your contacts\n  - Send transactional Emails and SMS\n  - and much more...\n\nYou can download our wrappers at https://github.com/orgs/brevo\n\n**Possible responses**\n  | Code | Message |\n  | :-------------: | ------------- |\n  | 200  | OK. Successful Request  |\n  | 201  | OK. Successful Creation |\n  | 202  | OK. Request accepted |\n  | 204  | OK. Successful Update/Deletion  |\n  | 400  | Error. Bad Request  |\n  | 401  | Error. Authentication Needed  |\n  | 402  | Error. Not enough credit, plan upgrade needed  |\n  | 403  | Error. Permission denied  |\n  | 404  | Error. Object does not exist |\n  | 405  | Error. Method not allowed  |\n  | 406  | Error. Not Acceptable  |\n  | 422  | Error. Unprocessable Entity |\n",
        "contact": {
            "name": "Brevo Support",
            "url": "https://account.brevo.com/support",
            "email": "contact@brevo.com"
        },
        "license": {
            "name": "MIT",
            "url": "http://opensource.org/licenses/MIT"
        },
        "version": "3.0.0"
    },
    "servers": [
        {
            "url": "https://api.brevo.com/v3"
        }
    ],
    "security": [
        {
            "api-key": []
        }
    ],
    "paths": {
        "/companies/{id}": {
            "delete": {
                "tags": [
                    "Companies"
                ],
                "summary": "Delete a company",
                "parameters": [
                    {
                        "name": "id",
                        "in": "path",
                        "required": true,
                        "schema": {
                            "type": "string"
                        },
                        "description": "Company ID to delete"
                    }
                ],
                "responses": {
                    "204": {
                        "description": "When company deleted"
                    },
                    "400": {
                        "description": "Returned when invalid data posted",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "required": [
                                        "code",
                                        "message"
                                    ],
                                    "type": "object",
                                    "properties": {
                                        "code": {
                                            "type": "string",
                                            "description": "Error code displayed in case of a failure",
                                            "example": "method_not_allowed",
                                            "enum": [
                                                "invalid_parameter",
                                                "missing_parameter",
                                                "out_of_range",
                                                "campaign_processing",
                                                "campaign_sent",
                                                "document_not_found",
                                                "not_enough_credits",
                                                "permission_denied",
                                                "duplicate_parameter",
                                                "duplicate_request",
                                                "method_not_allowed",
                                                "unauthorized",
                                                "account_under_validation",
                                                "not_acceptable",
                                                "bad_request",
                                                "unprocessable_entity"
                                            ]
                                        },
                                        "message": {
                                            "type": "string",
                                            "description": "Readable message associated to the failure",
                                            "example": "POST Method is not allowed on this path"
                                        }
                                    },
                                    "x-readme-ref-name": "errorModel"
                                },
                                "examples": {
                                    "response": {
                                        "value": {
                                            "message": "Route company id is not valid."
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "404": {
                        "description": "Returned when item not found",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "required": [
                                        "code",
                                        "message"
                                    ],
                                    "type": "object",
                                    "properties": {
                                        "code": {
                                            "type": "string",
                                            "description": "Error code displayed in case of a failure",
                                            "example": "method_not_allowed",
                                            "enum": [
                                                "invalid_parameter",
                                                "missing_parameter",
                                                "out_of_range",
                                                "campaign_processing",
                                                "campaign_sent",
                                                "document_not_found",
                                                "not_enough_credits",
                                                "permission_denied",
                                                "duplicate_parameter",
                                                "duplicate_request",
                                                "method_not_allowed",
                                                "unauthorized",
                                                "account_under_validation",
                                                "not_acceptable",
                                                "bad_request",
                                                "unprocessable_entity"
                                            ]
                                        },
                                        "message": {
                                            "type": "string",
                                            "description": "Readable message associated to the failure",
                                            "example": "POST Method is not allowed on this path"
                                        }
                                    },
                                    "x-readme-ref-name": "errorModel"
                                },
                                "examples": {
                                    "response": {
                                        "value": {
                                            "message": "Document not found"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    "components": {
        "securitySchemes": {
            "api-key": {
                "type": "apiKey",
                "description": "The API key should be passed in the request headers as `api-key` for authentication.",
                "name": "api-key",
                "in": "header"
            }
        }
    },
    "x-samples-languages": [
        "curl"
    ],
    "x-readme": {
        "explorer-enabled": true,
        "proxy-enabled": true
    },
    "_id": "5b68b4cdf052cf0003243f8e"
}
```


Update a company

# OpenAPI definition
```json
{
    "openapi": "3.0.1",
    "info": {
        "title": "Brevo API",
        "description": "Brevo provide a RESTFul API that can be used with any languages. With this API, you will be able to :\n  - Manage your campaigns and get the statistics\n  - Manage your contacts\n  - Send transactional Emails and SMS\n  - and much more...\n\nYou can download our wrappers at https://github.com/orgs/brevo\n\n**Possible responses**\n  | Code | Message |\n  | :-------------: | ------------- |\n  | 200  | OK. Successful Request  |\n  | 201  | OK. Successful Creation |\n  | 202  | OK. Request accepted |\n  | 204  | OK. Successful Update/Deletion  |\n  | 400  | Error. Bad Request  |\n  | 401  | Error. Authentication Needed  |\n  | 402  | Error. Not enough credit, plan upgrade needed  |\n  | 403  | Error. Permission denied  |\n  | 404  | Error. Object does not exist |\n  | 405  | Error. Method not allowed  |\n  | 406  | Error. Not Acceptable  |\n  | 422  | Error. Unprocessable Entity |\n",
        "contact": {
            "name": "Brevo Support",
            "url": "https://account.brevo.com/support",
            "email": "contact@brevo.com"
        },
        "license": {
            "name": "MIT",
            "url": "http://opensource.org/licenses/MIT"
        },
        "version": "3.0.0"
    },
    "servers": [
        {
            "url": "https://api.brevo.com/v3"
        }
    ],
    "security": [
        {
            "api-key": []
        }
    ],
    "paths": {
        "/companies/{id}": {
            "patch": {
                "tags": [
                    "Companies"
                ],
                "summary": "Update a company",
                "parameters": [
                    {
                        "name": "id",
                        "in": "path",
                        "required": true,
                        "schema": {
                            "type": "string"
                        }
                    }
                ],
                "requestBody": {
                    "required": true,
                    "description": "Updated company details.",
                    "content": {
                        "application/json": {
                            "schema": {
                                "properties": {
                                    "name": {
                                        "type": "string",
                                        "description": "Name of company",
                                        "example": "company"
                                    },
                                    "attributes": {
                                        "type": "object",
                                        "description": "Attributes for company update",
                                        "example": {
                                            "category": "label_2",
                                            "domain": "xyz",
                                            "date": "2022-05-04T00:00:00+05:30",
                                            "industry": "flipkart",
                                            "number_of_contacts": 1,
                                            "number_of_employees": 100,
                                            "owner": "5b1a17d914b73d35a76ca0c7",
                                            "phone_number": "81718441912",
                                            "revenue": 10000.34222
                                        }
                                    },
                                    "countryCode": {
                                        "type": "integer",
                                        "format": "int64",
                                        "description": "Country code if phone_number is passed in attributes.",
                                        "example": 91
                                    },
                                    "linkedContactsIds": {
                                        "items": {
                                            "type": "integer",
                                            "format": "int64"
                                        },
                                        "type": "array",
                                        "description": "Warning - Using PATCH on linkedContactIds replaces the list of linked contacts. Omitted IDs will be removed.",
                                        "example": [
                                            1,
                                            2,
                                            3
                                        ]
                                    },
                                    "linkedDealsIds": {
                                        "items": {
                                            "type": "string",
                                            "format": "objectID"
                                        },
                                        "type": "array",
                                        "description": "Warning - Using PATCH on linkedDealsIds replaces the list of linked contacts. Omitted IDs will be removed.",
                                        "example": [
                                            "61a5ce58c5d4795761045990",
                                            "61a5ce58c5d4795761045991",
                                            "61a5ce58c5d4795761045992"
                                        ]
                                    }
                                },
                                "type": "object"
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Company updated successfully",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "description": "Company Details",
                                    "properties": {
                                        "id": {
                                            "type": "string",
                                            "description": "Unique comoany id",
                                            "example": "629475917295261d9b1f4403"
                                        },
                                        "attributes": {
                                            "type": "object",
                                            "description": "Company attributes with values",
                                            "example": {
                                                "created_at": "2022-01-13T19:04:24.376+05:30",
                                                "domain": "xyz",
                                                "last_updated_at": "2022-04-01T18:47:48.283+05:30",
                                                "name": "text",
                                                "number_of_contacts": 0,
                                                "owner": "62260474111b1101704a9d85",
                                                "owner_assign_date": "2022-04-01T18:21:13.379+05:30",
                                                "phone_number": 8171844192,
                                                "revenue": 10
                                            }
                                        },
                                        "linkedContactsIds": {
                                            "items": {
                                                "type": "integer"
                                            },
                                            "type": "array",
                                            "format": "in64",
                                            "description": "Contact ids for contacts linked to this company",
                                            "example": [
                                                1,
                                                2,
                                                3
                                            ]
                                        },
                                        "linkedDealsIds": {
                                            "items": {
                                                "type": "string"
                                            },
                                            "type": "array",
                                            "format": "objectID",
                                            "description": "Deals ids for companies linked to this company",
                                            "example": [
                                                "61a5ce58c5d4795761045990",
                                                "61a5ce58c5d4795761045991",
                                                "61a5ce58c5d4795761045992"
                                            ]
                                        }
                                    },
                                    "x-readme-ref-name": "Company"
                                }
                            }
                        }
                    },
                    "400": {
                        "description": "Returned when invalid data posted",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "required": [
                                        "code",
                                        "message"
                                    ],
                                    "type": "object",
                                    "properties": {
                                        "code": {
                                            "type": "string",
                                            "description": "Error code displayed in case of a failure",
                                            "example": "method_not_allowed",
                                            "enum": [
                                                "invalid_parameter",
                                                "missing_parameter",
                                                "out_of_range",
                                                "campaign_processing",
                                                "campaign_sent",
                                                "document_not_found",
                                                "not_enough_credits",
                                                "permission_denied",
                                                "duplicate_parameter",
                                                "duplicate_request",
                                                "method_not_allowed",
                                                "unauthorized",
                                                "account_under_validation",
                                                "not_acceptable",
                                                "bad_request",
                                                "unprocessable_entity"
                                            ]
                                        },
                                        "message": {
                                            "type": "string",
                                            "description": "Readable message associated to the failure",
                                            "example": "POST Method is not allowed on this path"
                                        }
                                    },
                                    "x-readme-ref-name": "errorModel"
                                },
                                "examples": {
                                    "response": {
                                        "value": {
                                            "message": "Route attribute id is not valid."
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "404": {
                        "description": "Returned when company id is not found",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "required": [
                                        "code",
                                        "message"
                                    ],
                                    "type": "object",
                                    "properties": {
                                        "code": {
                                            "type": "string",
                                            "description": "Error code displayed in case of a failure",
                                            "example": "method_not_allowed",
                                            "enum": [
                                                "invalid_parameter",
                                                "missing_parameter",
                                                "out_of_range",
                                                "campaign_processing",
                                                "campaign_sent",
                                                "document_not_found",
                                                "not_enough_credits",
                                                "permission_denied",
                                                "duplicate_parameter",
                                                "duplicate_request",
                                                "method_not_allowed",
                                                "unauthorized",
                                                "account_under_validation",
                                                "not_acceptable",
                                                "bad_request",
                                                "unprocessable_entity"
                                            ]
                                        },
                                        "message": {
                                            "type": "string",
                                            "description": "Readable message associated to the failure",
                                            "example": "POST Method is not allowed on this path"
                                        }
                                    },
                                    "x-readme-ref-name": "errorModel"
                                },
                                "examples": {
                                    "response": {
                                        "value": {
                                            "message": "Document not found"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    "components": {
        "securitySchemes": {
            "api-key": {
                "type": "apiKey",
                "description": "The API key should be passed in the request headers as `api-key` for authentication.",
                "name": "api-key",
                "in": "header"
            }
        }
    },
    "x-samples-languages": [
        "curl"
    ],
    "x-readme": {
        "explorer-enabled": true,
        "proxy-enabled": true
    },
    "_id": "5b68b4cdf052cf0003243f8e"
}
```


Create a company/deal attribute

# OpenAPI definition
```json
{
    "openapi": "3.0.1",
    "info": {
        "title": "Brevo API",
        "description": "Brevo provide a RESTFul API that can be used with any languages. With this API, you will be able to :\n  - Manage your campaigns and get the statistics\n  - Manage your contacts\n  - Send transactional Emails and SMS\n  - and much more...\n\nYou can download our wrappers at https://github.com/orgs/brevo\n\n**Possible responses**\n  | Code | Message |\n  | :-------------: | ------------- |\n  | 200  | OK. Successful Request  |\n  | 201  | OK. Successful Creation |\n  | 202  | OK. Request accepted |\n  | 204  | OK. Successful Update/Deletion  |\n  | 400  | Error. Bad Request  |\n  | 401  | Error. Authentication Needed  |\n  | 402  | Error. Not enough credit, plan upgrade needed  |\n  | 403  | Error. Permission denied  |\n  | 404  | Error. Object does not exist |\n  | 405  | Error. Method not allowed  |\n  | 406  | Error. Not Acceptable  |\n  | 422  | Error. Unprocessable Entity |\n",
        "contact": {
            "name": "Brevo Support",
            "url": "https://account.brevo.com/support",
            "email": "contact@brevo.com"
        },
        "license": {
            "name": "MIT",
            "url": "http://opensource.org/licenses/MIT"
        },
        "version": "3.0.0"
    },
    "servers": [
        {
            "url": "https://api.brevo.com/v3"
        }
    ],
    "security": [
        {
            "api-key": []
        }
    ],
    "paths": {
        "/crm/attributes": {
            "post": {
                "tags": [
                    "Companies",
                    "Deals"
                ],
                "summary": "Create a company/deal attribute",
                "requestBody": {
                    "required": true,
                    "description": "Attribute creation data for a company/deal.",
                    "content": {
                        "application/json": {
                            "schema": {
                                "required": [
                                    "label",
                                    "attributeType",
                                    "objectType"
                                ],
                                "properties": {
                                    "label": {
                                        "type": "string",
                                        "description": "The label for the attribute (max 50 characters, cannot be empty)",
                                        "example": "Attribute Label"
                                    },
                                    "attributeType": {
                                        "type": "string",
                                        "description": "The type of attribute (must be one of the defined enums)",
                                        "enum": [
                                            "text",
                                            "user",
                                            "number",
                                            "single-select",
                                            "date",
                                            "boolean",
                                            "multi-choice"
                                        ],
                                        "example": "single-select"
                                    },
                                    "description": {
                                        "type": "string",
                                        "description": "A description of the attribute",
                                        "example": "This is a sample attribute description."
                                    },
                                    "optionsLabels": {
                                        "type": "array",
                                        "items": {
                                            "type": "string"
                                        },
                                        "description": "Options for multi-choice or single-select attributes",
                                        "example": [
                                            "Option 1",
                                            "Option 2",
                                            "Option 3"
                                        ]
                                    },
                                    "objectType": {
                                        "type": "string",
                                        "description": "The type of object the attribute belongs to (prefilled with `companies` or `deal`, mandatory)",
                                        "example": "companies,deal",
                                        "enum": [
                                            "companies",
                                            "deals"
                                        ]
                                    }
                                },
                                "type": "object"
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Created new attribute",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": [
                                        "id"
                                    ],
                                    "properties": {
                                        "id": {
                                            "type": "string",
                                            "description": "Unique ID of the created attribute",
                                            "example": "61a5cd07ca1347c82306ad07"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "400": {
                        "description": "Returned when invalid data is posted",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "required": [
                                        "code",
                                        "message"
                                    ],
                                    "type": "object",
                                    "properties": {
                                        "code": {
                                            "type": "string",
                                            "description": "Error code displayed in case of a failure",
                                            "example": "method_not_allowed",
                                            "enum": [
                                                "invalid_parameter",
                                                "missing_parameter",
                                                "out_of_range",
                                                "campaign_processing",
                                                "campaign_sent",
                                                "document_not_found",
                                                "not_enough_credits",
                                                "permission_denied",
                                                "duplicate_parameter",
                                                "duplicate_request",
                                                "method_not_allowed",
                                                "unauthorized",
                                                "account_under_validation",
                                                "not_acceptable",
                                                "bad_request",
                                                "unprocessable_entity"
                                            ]
                                        },
                                        "message": {
                                            "type": "string",
                                            "description": "Readable message associated to the failure",
                                            "example": "POST Method is not allowed on this path"
                                        }
                                    },
                                    "x-readme-ref-name": "errorModel"
                                },
                                "examples": {
                                    "response": {
                                        "value": {
                                            "message": "Not valid data."
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    "components": {
        "securitySchemes": {
            "api-key": {
                "type": "apiKey",
                "description": "The API key should be passed in the request headers as `api-key` for authentication.",
                "name": "api-key",
                "in": "header"
            }
        }
    },
    "x-samples-languages": [
        "curl"
    ],
    "x-readme": {
        "explorer-enabled": true,
        "proxy-enabled": true
    },
    "_id": "5b68b4cdf052cf0003243f8e"
}
```


Get company attributes

# OpenAPI definition
```json
{
    "openapi": "3.0.1",
    "info": {
        "title": "Brevo API",
        "description": "Brevo provide a RESTFul API that can be used with any languages. With this API, you will be able to :\n  - Manage your campaigns and get the statistics\n  - Manage your contacts\n  - Send transactional Emails and SMS\n  - and much more...\n\nYou can download our wrappers at https://github.com/orgs/brevo\n\n**Possible responses**\n  | Code | Message |\n  | :-------------: | ------------- |\n  | 200  | OK. Successful Request  |\n  | 201  | OK. Successful Creation |\n  | 202  | OK. Request accepted |\n  | 204  | OK. Successful Update/Deletion  |\n  | 400  | Error. Bad Request  |\n  | 401  | Error. Authentication Needed  |\n  | 402  | Error. Not enough credit, plan upgrade needed  |\n  | 403  | Error. Permission denied  |\n  | 404  | Error. Object does not exist |\n  | 405  | Error. Method not allowed  |\n  | 406  | Error. Not Acceptable  |\n  | 422  | Error. Unprocessable Entity |\n",
        "contact": {
            "name": "Brevo Support",
            "url": "https://account.brevo.com/support",
            "email": "contact@brevo.com"
        },
        "license": {
            "name": "MIT",
            "url": "http://opensource.org/licenses/MIT"
        },
        "version": "3.0.0"
    },
    "servers": [
        {
            "url": "https://api.brevo.com/v3"
        }
    ],
    "security": [
        {
            "api-key": []
        }
    ],
    "paths": {
        "/crm/attributes/companies": {
            "get": {
                "tags": [
                    "Companies"
                ],
                "summary": "Get company attributes",
                "responses": {
                    "200": {
                        "description": "Returns list of company attributes",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "array",
                                    "description": "List of company attributes",
                                    "items": {
                                        "type": "object",
                                        "description": "List of attributes",
                                        "properties": {
                                            "internalName": {
                                                "type": "string",
                                                "example": "name"
                                            },
                                            "label": {
                                                "type": "string",
                                                "example": "Company Name"
                                            },
                                            "attributeTypeName": {
                                                "type": "string",
                                                "example": "text"
                                            },
                                            "attributeOptions": {
                                                "type": "array",
                                                "items": {
                                                    "type": "object",
                                                    "example": {
                                                        "key": "custom key",
                                                        "value": "custom label"
                                                    }
                                                }
                                            },
                                            "isRequired": {
                                                "type": "boolean",
                                                "example": true
                                            }
                                        }
                                    },
                                    "x-readme-ref-name": "CompanyAttributes"
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    "components": {
        "securitySchemes": {
            "api-key": {
                "type": "apiKey",
                "description": "The API key should be passed in the request headers as `api-key` for authentication.",
                "name": "api-key",
                "in": "header"
            }
        }
    },
    "x-samples-languages": [
        "curl"
    ],
    "x-readme": {
        "explorer-enabled": true,
        "proxy-enabled": true
    },
    "_id": "5b68b4cdf052cf0003243f8e"
}
```


Link and Unlink company with contact and deal

# OpenAPI definition
```json
{
    "openapi": "3.0.1",
    "info": {
        "title": "Brevo API",
        "description": "Brevo provide a RESTFul API that can be used with any languages. With this API, you will be able to :\n  - Manage your campaigns and get the statistics\n  - Manage your contacts\n  - Send transactional Emails and SMS\n  - and much more...\n\nYou can download our wrappers at https://github.com/orgs/brevo\n\n**Possible responses**\n  | Code | Message |\n  | :-------------: | ------------- |\n  | 200  | OK. Successful Request  |\n  | 201  | OK. Successful Creation |\n  | 202  | OK. Request accepted |\n  | 204  | OK. Successful Update/Deletion  |\n  | 400  | Error. Bad Request  |\n  | 401  | Error. Authentication Needed  |\n  | 402  | Error. Not enough credit, plan upgrade needed  |\n  | 403  | Error. Permission denied  |\n  | 404  | Error. Object does not exist |\n  | 405  | Error. Method not allowed  |\n  | 406  | Error. Not Acceptable  |\n  | 422  | Error. Unprocessable Entity |\n",
        "contact": {
            "name": "Brevo Support",
            "url": "https://account.brevo.com/support",
            "email": "contact@brevo.com"
        },
        "license": {
            "name": "MIT",
            "url": "http://opensource.org/licenses/MIT"
        },
        "version": "3.0.0"
    },
    "servers": [
        {
            "url": "https://api.brevo.com/v3"
        }
    ],
    "security": [
        {
            "api-key": []
        }
    ],
    "paths": {
        "/companies/link-unlink/{id}": {
            "patch": {
                "tags": [
                    "Companies"
                ],
                "summary": "Link and Unlink company with contact and deal",
                "parameters": [
                    {
                        "name": "id",
                        "in": "path",
                        "required": true,
                        "schema": {
                            "type": "string"
                        }
                    }
                ],
                "requestBody": {
                    "required": true,
                    "description": "Linked / Unlinked contacts and deals ids.",
                    "content": {
                        "application/json": {
                            "schema": {
                                "properties": {
                                    "linkContactIds": {
                                        "items": {
                                            "type": "integer",
                                            "format": "int64"
                                        },
                                        "type": "array",
                                        "description": "Contact ids for contacts to be linked with company",
                                        "example": [
                                            1,
                                            2,
                                            3
                                        ]
                                    },
                                    "unlinkContactIds": {
                                        "items": {
                                            "type": "integer",
                                            "format": "int64"
                                        },
                                        "type": "array",
                                        "description": "Contact ids for contacts to be unlinked from company",
                                        "example": [
                                            4,
                                            5,
                                            6
                                        ]
                                    },
                                    "linkDealsIds": {
                                        "items": {
                                            "type": "string"
                                        },
                                        "type": "array",
                                        "description": "Deal ids for deals to be linked with company",
                                        "example": [
                                            "61a5ce58c5d4795761045990",
                                            "61a5ce58c5d4795761045991",
                                            "61a5ce58c5d4795761045992"
                                        ]
                                    },
                                    "unlinkDealsIds": {
                                        "items": {
                                            "type": "string"
                                        },
                                        "type": "array",
                                        "description": "Deal ids for deals to be unlinked from company",
                                        "example": [
                                            "61a5ce58c5d4795761045994",
                                            "61a5ce58c5d479576104595",
                                            "61a5ce58c5d4795761045996"
                                        ]
                                    }
                                },
                                "type": "object"
                            }
                        }
                    }
                },
                "responses": {
                    "204": {
                        "description": "Successfully linked/unlinked contacts/deals with the company."
                    },
                    "400": {
                        "description": "Returned when query params are invalid or invalid data provided in request.",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "required": [
                                        "code",
                                        "message"
                                    ],
                                    "type": "object",
                                    "properties": {
                                        "code": {
                                            "type": "string",
                                            "description": "Error code displayed in case of a failure",
                                            "example": "method_not_allowed",
                                            "enum": [
                                                "invalid_parameter",
                                                "missing_parameter",
                                                "out_of_range",
                                                "campaign_processing",
                                                "campaign_sent",
                                                "document_not_found",
                                                "not_enough_credits",
                                                "permission_denied",
                                                "duplicate_parameter",
                                                "duplicate_request",
                                                "method_not_allowed",
                                                "unauthorized",
                                                "account_under_validation",
                                                "not_acceptable",
                                                "bad_request",
                                                "unprocessable_entity"
                                            ]
                                        },
                                        "message": {
                                            "type": "string",
                                            "description": "Readable message associated to the failure",
                                            "example": "POST Method is not allowed on this path"
                                        }
                                    },
                                    "x-readme-ref-name": "errorModel"
                                },
                                "examples": {
                                    "response": {
                                        "value": {
                                            "message": "Not valid data."
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    "components": {
        "securitySchemes": {
            "api-key": {
                "type": "apiKey",
                "description": "The API key should be passed in the request headers as `api-key` for authentication.",
                "name": "api-key",
                "in": "header"
            }
        }
    },
    "x-samples-languages": [
        "curl"
    ],
    "x-readme": {
        "explorer-enabled": true,
        "proxy-enabled": true
    },
    "_id": "5b68b4cdf052cf0003243f8e"
}
```


Import companies(creation and updation)

# OpenAPI definition
```json
{
    "openapi": "3.0.1",
    "info": {
        "title": "Brevo API",
        "description": "Brevo provide a RESTFul API that can be used with any languages. With this API, you will be able to :\n  - Manage your campaigns and get the statistics\n  - Manage your contacts\n  - Send transactional Emails and SMS\n  - and much more...\n\nYou can download our wrappers at https://github.com/orgs/brevo\n\n**Possible responses**\n  | Code | Message |\n  | :-------------: | ------------- |\n  | 200  | OK. Successful Request  |\n  | 201  | OK. Successful Creation |\n  | 202  | OK. Request accepted |\n  | 204  | OK. Successful Update/Deletion  |\n  | 400  | Error. Bad Request  |\n  | 401  | Error. Authentication Needed  |\n  | 402  | Error. Not enough credit, plan upgrade needed  |\n  | 403  | Error. Permission denied  |\n  | 404  | Error. Object does not exist |\n  | 405  | Error. Method not allowed  |\n  | 406  | Error. Not Acceptable  |\n  | 422  | Error. Unprocessable Entity |\n",
        "contact": {
            "name": "Brevo Support",
            "url": "https://account.brevo.com/support",
            "email": "contact@brevo.com"
        },
        "license": {
            "name": "MIT",
            "url": "http://opensource.org/licenses/MIT"
        },
        "version": "3.0.0"
    },
    "servers": [
        {
            "url": "https://api.brevo.com/v3"
        }
    ],
    "security": [
        {
            "api-key": []
        }
    ],
    "paths": {
        "/companies/import": {
            "post": {
                "tags": [
                    "Companies"
                ],
                "summary": "Import companies(creation and updation)",
                "description": "Import companies from a CSV file with mapping options.",
                "requestBody": {
                    "required": true,
                    "content": {
                        "multipart/form-data": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "file": {
                                        "type": "string",
                                        "format": "binary",
                                        "description": "The CSV file to upload.The file should have the first row as the mapping attribute. Some default attribute names are\n(a) company_id [brevo mongoID to update deals]\n(b) associated_contact\n(c) associated_deal\n(f) any other attribute with internal name\n",
                                        "example": false
                                    },
                                    "mapping": {
                                        "type": "object",
                                        "description": "The mapping options in JSON format. Here is an example of the JSON structure:\n```json\n{\n  \"link_entities\": true, // Determines whether to link related entities during the import process\n  \"unlink_entities\": false, // Determines whether to unlink related entities during the import process\n  \"update_existing_records\": true, // Determines whether to update based on company ID or treat every row as create\n  \"unset_empty_attributes\": false // Determines whether to unset a specific attribute during update if the values input is blank\n}\n```\n"
                                    }
                                }
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Successfully imported deals",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "processId": {
                                            "type": "integer",
                                            "description": "The ID of the import process",
                                            "example": 50
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "400": {
                        "description": "Bad request",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "message": {
                                            "type": "string",
                                            "example": "Bad request : With reason"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    "components": {
        "securitySchemes": {
            "api-key": {
                "type": "apiKey",
                "description": "The API key should be passed in the request headers as `api-key` for authentication.",
                "name": "api-key",
                "in": "header"
            }
        }
    },
    "x-samples-languages": [
        "curl"
    ],
    "x-readme": {
        "explorer-enabled": true,
        "proxy-enabled": true
    },
    "_id": "5b68b4cdf052cf0003243f8e"
}
```