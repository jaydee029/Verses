package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

func respondWithError(w http.ResponseWriter, code int, res string) {
	if code > 499 {
		log.Printf("Responding with %d error: %s", code, res)
	}
	type errresponse struct {
		Error string `json:"error"`
	}
	respondWithJson(w, code, errresponse{
		Error: res,
	})
}

func respondWithJson(w http.ResponseWriter, code int, res interface{}) {
	w.Header().Set("content-type", "application/json")
	data, err := json.Marshal(res)
	if err != nil {
		log.Printf("Error marshalling JSON: %s", err)
		w.WriteHeader(500)
		return
	}

	w.WriteHeader(code)
	w.Write(data)
}

func writesse(w io.Writer, event string, res interface{}) {

	v, err := json.Marshal(res)
	if err != nil {
		log.Printf("could not marshal response, err:%v", err)
		fmt.Fprintf(w, "error: %v\n\n", err)
		return
	}

	fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, string(v))

}
