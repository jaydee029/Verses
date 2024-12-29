package pubsub

import (
	"bytes"
	"context"
	"encoding/gob"
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
)

func publish[T any](conn *amqp.Connection, exchange string, val T) error {

	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	var buffer bytes.Buffer
	enc := gob.NewEncoder(&buffer)

	err = enc.Encode(val)
	if err != nil {
		return err
	}

	return ch.PublishWithContext(context.Background(), exchange, "", false, false, amqp.Publishing{
		ContentType: "application/gob",
		Body:        buffer.Bytes(),
	})
}

func consume[T any](conn *amqp.Connection, exchange, queueName string) (<-chan T, error) {

	msgch := make(chan T)

	subch, queue, err := DeclareAndBind(conn, exchange, queueName, "")

	if err != nil {
		return msgch, err
	}

	deliverychan, err := subch.Consume(queue.Name, "", false, false, false, false, nil)
	if err != nil {
		return msgch, err
	}

	go func() {
		for msg := range deliverychan {
			buffer := bytes.NewBuffer(msg.Body)
			decoder := gob.NewDecoder(buffer)
			var data T
			err := decoder.Decode(&data)
			log.Println("error while decoding the message:", err)
			msgch <- data
		}
	}()
	return msgch, nil
}

func DeclareAndBind(conn *amqp.Connection, exchange, queueName, key string) (*amqp.Channel, amqp.Queue, error) {
	pubchannel, err := conn.Channel()

	if err != nil {
		return nil, amqp.Queue{}, err
	}

	table := amqp.Table{}
	table["x-dead-letter-exchange"] = "dlx"
	pubqueue, err := pubchannel.QueueDeclare(queueName,
		true,
		false,
		false,
		false, table)

	if err != nil {
		return nil, amqp.Queue{}, err
	}

	err = pubchannel.QueueBind(queueName, key, exchange, false, nil)
	if err != nil {
		return nil, amqp.Queue{}, err
	}

	return pubchannel, pubqueue, nil
}

/*
package pubsub

import (
	"bytes"
	"context"
	"encoding/gob"
	"encoding/json"
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
)

type QueueType int
type Acktype int

const (
	DurableQueue QueueType = iota
	TransientQueue
)

const (
	Ack Acktype = iota
	NackRequeue
	NackDiscard
)

func DeclareAndBind(conn *amqp.Connection, exchange, queueName, key string, simpleQueueType QueueType) (*amqp.Channel, amqp.Queue, error) {
	pubchannel, err := conn.Channel()

	if err != nil {
		return nil, amqp.Queue{}, err
	}

	table := amqp.Table{}
	table["x-dead-letter-exchange"] = "peril_dlx"
	pubqueue, err := pubchannel.QueueDeclare(queueName,
		simpleQueueType == DurableQueue,
		simpleQueueType != DurableQueue,
		simpleQueueType != DurableQueue,
		false, table)

	if err != nil {
		return nil, amqp.Queue{}, err
	}

	err = pubchannel.QueueBind(queueName, key, exchange, false, nil)
	if err != nil {
		return nil, amqp.Queue{}, err
	}

	return pubchannel, pubqueue, nil
}

func SubscribeJSON[T any](conn *amqp.Connection, exchange, queueName, key string, simpleQueueType QueueType, handler func(T) Acktype) error {

	return subscribe(conn, exchange, queueName, key, simpleQueueType, handler, func(msg []byte) (T, error) {
		var data T
		err := json.Unmarshal(msg, &data)
		return data, err
	})
}

func SubscribeGob[T any](conn *amqp.Connection, exchange, queueName, key string, simpleQueueType QueueType, handler func(T) Acktype) error {

	buffer := bytes.NewBuffer(msg)
	decoder := gob.NewDecoder(buffer)
	var data T
	err := decoder.Decode(&data)

	subch, queue, err := DeclareAndBind(conn, exchange, queueName, key, simpleQueueType)

	if err != nil {
	return err
	}

	deliverychan, err := subch.Consume(queue.Name, "", false, false, false, false, nil)
	if err != nil {
		return err
	}



}

func subscribe[T any](conn *amqp.Connection, exchange, queueName, key string, simpleQueueType QueueType, handler func(T) Acktype, unmarshaller func([]byte) (T, error)) error {

	subch, queue, err := DeclareAndBind(conn, exchange, queueName, key, simpleQueueType)

	if err != nil {
		return err
	}

	deliverychan, err := subch.Consume(queue.Name, "", false, false, false, false, nil)

	if err != nil {
		return err
	}

	go func() {
		defer subch.Close()
		for k := range deliverychan {
			data, err := unmarshaller(k.Body)
			if err != nil {
				log.Println(err)
			}
			switch handler(data) {
			case Ack:
				k.Ack(false)
			case NackRequeue:
				k.Nack(false, true)
			case NackDiscard:
				k.Nack(false, false)
			}
		}
	}()
	return nil
}

*/